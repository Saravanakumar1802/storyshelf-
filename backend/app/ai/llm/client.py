"""
One way to ask a language model anything, with free-tier resilience built in.

    text, meta = await llm.complete(task="mood", group="fast", messages=[...])
    value, meta = await llm.complete_json(MoodQuery, task="mood", group="fast", messages=[...])
    async for event in llm.stream(task="ask", group="smart", messages=[...]): ...

For each request the client walks the group's fallback chain (providers.py):

1. Deployments whose circuit breaker is open (health.py) are skipped for free.
2. The next one is called through LiteLLM, which speaks every provider's API.
3. On failure (quota, outage, timeout, an answer that isn't the JSON we asked
   for) the reason is recorded, the breaker may open, and the next deployment is tried.
4. The first good answer wins. Its `AiMeta` names the model and every hop
   before it, which the site shows next to the answer.

If the whole chain fails, callers get a friendly AI_UNAVAILABLE error; the
non-AI parts of the library (reading, keyword search) keep working.

LiteLLM's own Router could do the fallback, but it hides which deployments
failed and why. That trail is exactly what the status panel and the AI chips
show, so this small policy owns it.
"""

import json
import logging
import re
import time
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass
from typing import Any

import litellm
from pydantic import BaseModel, ValidationError

from app.ai.cache import AiCache, cache_key
from app.ai.llm.health import FailureKind, HealthBook, classify, retry_after_s
from app.ai.llm.providers import CHAINS, Deployment, Group, build_deployments
from app.ai.llm.quota import DailyQuota
from app.ai.llm.telemetry import Attempt, CallLog
from app.ai.schemas import AiMeta, FallbackHop
from app.core.config import Settings
from app.core.errors import AppError, ErrorCode
from app.db.mongo import Database

log = logging.getLogger(__name__)

CompletionFn = Callable[..., Awaitable[Any]]
Messages = list[dict[str, str]]

AI_RESTING = (
    "Our AI librarians are resting: the free model quotas reset shortly. Please try again in a minute."
)
AI_OFF = "The AI librarian isn't switched on yet. Reading and search work as usual in the meantime."
_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.I)


class InvalidOutput(Exception):
    """The model answered, but not with what we asked for."""


@dataclass(frozen=True)
class StreamToken:
    text: str


@dataclass(frozen=True)
class StreamDone:
    meta: AiMeta


StreamEvent = StreamToken | StreamDone


def ai_unavailable(configured: bool = True) -> AppError:
    """Every model failed (configured) or none has a key at all (not configured): say which, honestly."""
    return AppError(ErrorCode.AI_UNAVAILABLE, AI_RESTING if configured else AI_OFF)


def parse_json[M: BaseModel](text: str, schema: type[M]) -> M:
    """Models wrap JSON in fences or chatter; take the outermost object and validate it."""
    body = _FENCE.sub("", text.strip())
    start, end = body.find("{"), body.rfind("}")
    if start < 0 or end <= start:
        raise InvalidOutput("no JSON object in the answer")
    try:
        return schema.model_validate(json.loads(body[start : end + 1]))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise InvalidOutput(str(exc)[:200]) from exc


def _message_text(resp: Any) -> str:
    try:
        return str(resp.choices[0].message.content or "").strip()
    except (AttributeError, IndexError):
        return ""


def _delta_text(chunk: Any) -> str:
    try:
        return str(chunk.choices[0].delta.content or "")
    except (AttributeError, IndexError):
        return ""


def _usage(resp: Any) -> tuple[int | None, int | None]:
    usage = getattr(resp, "usage", None)
    return getattr(usage, "prompt_tokens", None), getattr(usage, "completion_tokens", None)


def _elapsed_ms(start: float) -> int:
    return int((time.perf_counter() - start) * 1000)


class LlmClient:
    def __init__(
        self,
        deployments: dict[str, Deployment],
        *,
        log_to: CallLog | None = None,
        cache: AiCache | None = None,
        health: HealthBook | None = None,
        completion: CompletionFn | None = None,
        timeout_s: float = 30,
        quota: DailyQuota | None = None,
    ) -> None:
        self.deployments = deployments
        self.quota = quota or DailyQuota(0)
        self.health = health or HealthBook()
        self._log = log_to
        self._cache = cache
        self._completion = completion or litellm.acompletion
        self._timeout_s = timeout_s

    # ── chains ──

    def chain(self, group: Group) -> list[Deployment]:
        return [d for i in CHAINS[group] if (d := self.deployments[i]).configured]

    @property
    def configured(self) -> bool:
        return any(d.configured for d in self.deployments.values())

    # ── public API ──

    async def complete(
        self,
        *,
        task: str,
        group: Group,
        messages: Messages,
        max_tokens: int = 700,
        temperature: float = 0.4,
        cache_ttl_s: int | None = None,
        user_id: str | None = None,
    ) -> tuple[str, AiMeta]:
        return await self._run(
            task, group, messages, max_tokens, temperature, False, lambda t: t, cache_ttl_s, user_id
        )

    async def complete_json[M: BaseModel](
        self,
        schema: type[M],
        *,
        task: str,
        group: Group,
        messages: Messages,
        max_tokens: int = 900,
        temperature: float = 0.2,
        cache_ttl_s: int | None = None,
        user_id: str | None = None,
    ) -> tuple[M, AiMeta]:
        return await self._run(
            task,
            group,
            messages,
            max_tokens,
            temperature,
            True,
            lambda t: parse_json(t, schema),
            cache_ttl_s,
            user_id,
            schema.__name__,
        )

    async def stream(
        self,
        *,
        task: str,
        group: Group,
        messages: Messages,
        max_tokens: int = 900,
        temperature: float = 0.4,
        user_id: str | None = None,
    ) -> AsyncIterator[StreamEvent]:
        self.quota.check(user_id)
        request_id, hops = uuid.uuid4().hex, list[FallbackHop]()
        for d in self._usable(group, hops):
            start = time.perf_counter()
            try:
                resp = await self._call(d, messages, max_tokens, temperature, json_output=False, stream=True)
                chunks = resp.__aiter__()
                first = ""
                while not first:  # some providers open with empty role-only chunks
                    first = _delta_text(await chunks.__anext__())
            except StopAsyncIteration:
                self._failed(request_id, task, group, d, start, hops, FailureKind.BAD_OUTPUT, None, user_id)
                continue
            except Exception as exc:
                self._failed(request_id, task, group, d, start, hops, classify(exc), exc, user_id)
                continue
            # from the first token on we are committed to this model: text can't be un-sent
            yield StreamToken(first)
            try:
                async for chunk in chunks:
                    if delta := _delta_text(chunk):
                        yield StreamToken(delta)
            except Exception as exc:
                self._failed(request_id, task, group, d, start, [], classify(exc), exc, user_id)
                raise AppError(
                    ErrorCode.AI_UNAVAILABLE, "The answer was interrupted. Please ask again."
                ) from exc
            meta = self._succeeded(request_id, task, group, d, start, hops, (None, None), user_id)
            self.quota.spend(user_id)
            yield StreamDone(meta)
            return
        raise ai_unavailable(bool(self.chain(group)))

    # ── the failover loop ──

    async def _run(
        self,
        task: str,
        group: Group,
        messages: Messages,
        max_tokens: int,
        temperature: float,
        json_output: bool,
        parse: Callable[[str], Any],
        cache_ttl_s: int | None,
        user_id: str | None,
        shape: str = "text",
    ) -> tuple[Any, AiMeta]:
        key = None
        if cache_ttl_s and self._cache is not None:
            key = cache_key({"group": group, "messages": messages, "max_tokens": max_tokens, "shape": shape})
            if (hit := await self._cache.get(key)) is not None:
                try:
                    return parse(hit["text"]), self._cache_hit(task, group, hit, user_id)
                except InvalidOutput:
                    pass  # a stale entry in an old shape: ask again

        self.quota.check(user_id)  # after the cache: a cached answer costs nothing
        request_id, hops = uuid.uuid4().hex, list[FallbackHop]()
        for d in self._usable(group, hops):
            start = time.perf_counter()
            try:
                resp = await self._call(d, messages, max_tokens, temperature, json_output=json_output)
                text = _message_text(resp)
                if not text:
                    raise InvalidOutput("empty answer")
                value = parse(text)
            except InvalidOutput as exc:
                self._failed(request_id, task, group, d, start, hops, FailureKind.BAD_OUTPUT, exc, user_id)
                continue
            except Exception as exc:
                self._failed(request_id, task, group, d, start, hops, classify(exc), exc, user_id)
                continue
            meta = self._succeeded(request_id, task, group, d, start, hops, _usage(resp), user_id)
            self.quota.spend(user_id)
            if key is not None and self._cache is not None:
                await self._cache.put(
                    key, text=text, provider=d.provider, model=d.model_name, ttl_s=cache_ttl_s or 0
                )
            return value, meta
        raise ai_unavailable(bool(self.chain(group)))

    def _usable(self, group: Group, hops: list[FallbackHop]) -> list[Deployment]:
        """The chain in order; open breakers are noted as hops and skipped."""
        usable = []
        for d in self.chain(group):
            if self.health.is_cooling(d.id):
                hops.append(FallbackHop(provider=d.provider, model=d.model_name, reason="cooling_down"))
            else:
                usable.append(d)
        return usable

    async def _call(
        self,
        d: Deployment,
        messages: Messages,
        max_tokens: int,
        temperature: float,
        *,
        json_output: bool,
        stream: bool = False,
    ) -> Any:
        extra: dict[str, Any] = {}
        if json_output and d.json_mode:
            extra["response_format"] = {"type": "json_object"}
        return await self._completion(
            model=d.model,
            messages=messages,
            api_key=d.api_key,
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=self._timeout_s,
            num_retries=0,  # retrying is the next deployment's job
            stream=stream,
            **extra,
        )

    # ── bookkeeping ──

    def _record(self, attempt: Attempt) -> None:
        if self._log is not None:
            self._log.record(attempt)

    def _failed(
        self,
        request_id: str,
        task: str,
        group: str,
        d: Deployment,
        start: float,
        hops: list[FallbackHop],
        kind: FailureKind,
        exc: BaseException | None,
        user_id: str | None,
    ) -> None:
        self.health.record_failure(d.id, kind, retry_after_s(exc) if exc else None)
        log.warning("%s via %s failed: %s (%s)", task, d.id, kind.value, str(exc)[:160] if exc else "")
        self._record(
            Attempt(
                request_id, task, group, d.id, d.provider, d.model_name, ok=False,
                latency_ms=_elapsed_ms(start), failure=kind.value, fallback=bool(hops), user_id=user_id,
            )
        )  # fmt: skip
        hops.append(FallbackHop(provider=d.provider, model=d.model_name, reason=kind.value))

    def _succeeded(
        self,
        request_id: str,
        task: str,
        group: str,
        d: Deployment,
        start: float,
        hops: list[FallbackHop],
        usage: tuple[int | None, int | None],
        user_id: str | None,
    ) -> AiMeta:
        ms = _elapsed_ms(start)
        self.health.record_success(d.id)
        self._record(
            Attempt(
                request_id, task, group, d.id, d.provider, d.model_name, ok=True, latency_ms=ms,
                fallback=bool(hops), tokens_in=usage[0], tokens_out=usage[1], user_id=user_id,
            )
        )  # fmt: skip
        return AiMeta(task=task, provider=d.provider, model=d.model_name, latency_ms=ms, fallbacks=list(hops))

    def _cache_hit(self, task: str, group: str, hit: dict[str, Any], user_id: str | None) -> AiMeta:
        self._record(
            Attempt(
                uuid.uuid4().hex, task, group, "cache", hit["provider"], hit["model"], ok=True,
                latency_ms=0, cached=True, user_id=user_id,
            )
        )  # fmt: skip
        return AiMeta(task=task, provider=hit["provider"], model=hit["model"], latency_ms=0, cached=True)


def build_llm(settings: Settings, db: Database | None) -> LlmClient:
    """The app's client: keys and models from .env; logging and caching when a database is connected."""
    return LlmClient(
        build_deployments(settings),
        log_to=CallLog(db) if db is not None else None,
        cache=AiCache(db) if db is not None else None,
        timeout_s=settings.llm_timeout_seconds,
        quota=DailyQuota(settings.ai_daily_quota_per_user),
    )
