"""
The failover policy, driven by a scripted fake provider: no network, no keys, no quota.

Chains under test (providers.py), with Groq, Cerebras and Gemini configured:
    fast  = groq-fast -> cerebras -> gemini-lite
    smart = groq-smart -> cerebras -> gemini
"""

from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

import pytest
from litellm import exceptions as llm_errors
from pydantic import BaseModel

from app.ai.llm.client import InvalidOutput, LlmClient, StreamDone, StreamToken, parse_json
from app.ai.llm.health import FailureKind, classify
from app.ai.llm.providers import build_deployments
from app.ai.llm.telemetry import Attempt
from app.core.config import Settings
from app.core.errors import AppError, ErrorCode

MSG = [{"role": "user", "content": "hi"}]


def rate_limited(retry_after: str | None = None) -> Exception:
    headers = {"retry-after": retry_after} if retry_after else None
    return llm_errors.RateLimitError("quota", llm_provider="x", model="m", headers=headers)


def bad_key() -> Exception:
    return llm_errors.AuthenticationError("bad key", llm_provider="x", model="m")


def outage() -> Exception:
    return llm_errors.ServiceUnavailableError("down", llm_provider="x", model="m")


class FakeProvider:
    """Plays a script per model id: a str answers, an Exception raises, a list[str] streams tokens."""

    def __init__(self, script: dict[str, list[Any]]) -> None:
        self.script = script
        self.calls: list[tuple[str, dict[str, Any]]] = []

    async def __call__(self, *, model: str, messages: list[dict[str, str]], **kw: Any) -> Any:
        self.calls.append((model, kw))
        outcome = self.script[model].pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        if kw.get("stream"):
            return self._stream(outcome)
        message = SimpleNamespace(content=outcome)
        usage = SimpleNamespace(prompt_tokens=12, completion_tokens=5)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)], usage=usage)

    @staticmethod
    async def _stream(parts: list[Any]) -> AsyncIterator[Any]:
        for p in parts:
            if isinstance(p, Exception):
                raise p
            yield SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content=p))])

    def models(self) -> list[str]:
        return [m for m, _ in self.calls]


class FakeLog:
    def __init__(self) -> None:
        self.attempts: list[Attempt] = []

    def record(self, attempt: Attempt) -> None:
        self.attempts.append(attempt)


class FakeCache:
    def __init__(self) -> None:
        self.rows: dict[str, dict[str, Any]] = {}

    async def get(self, key: str) -> dict[str, Any] | None:
        return self.rows.get(key)

    async def put(self, key: str, *, text: str, provider: str, model: str, ttl_s: int) -> None:
        self.rows[key] = {"text": text, "provider": provider, "model": model}


def make_client(script: dict[str, list[Any]], **keys: str) -> tuple[LlmClient, FakeProvider, FakeLog]:
    settings = Settings(  # type: ignore[call-arg]
        _env_file=None,
        groq_api_key=keys.get("groq", "g"),
        cerebras_api_key=keys.get("cerebras", "c"),
        gemini_api_key=keys.get("gemini", "m"),
        mistral_api_key=keys.get("mistral"),
        openrouter_api_key=keys.get("openrouter"),
        github_models_token=None,
    )
    deployments = build_deployments(settings)
    script = {deployments[k].model: v for k, v in script.items()}
    provider, log = FakeProvider(script), FakeLog()
    client = LlmClient(deployments, log_to=log, completion=provider)  # type: ignore[arg-type]
    return client, provider, log


async def test_first_model_in_the_chain_answers() -> None:
    llm, provider, log = make_client({"groq-smart": ["Hello reader"]})
    text, meta = await llm.complete(task="ask", group="smart", messages=MSG)
    assert text == "Hello reader"
    assert (meta.provider, meta.model, meta.fallbacks, meta.cached) == (
        "Groq",
        "openai/gpt-oss-120b",
        [],
        False,
    )
    assert provider.calls[0][1]["num_retries"] == 0  # retries are the next deployment's job
    assert [(a.deployment, a.ok, a.fallback) for a in log.attempts] == [("groq-smart", True, False)]
    assert log.attempts[0].tokens_in == 12


async def test_rate_limit_falls_back_and_opens_the_breaker() -> None:
    llm, provider, _ = make_client({"groq-smart": [rate_limited()], "cerebras": ["from cerebras", "again"]})
    _, meta = await llm.complete(task="ask", group="smart", messages=MSG)
    assert meta.provider == "Cerebras"
    assert [(h.provider, h.reason) for h in meta.fallbacks] == [("Groq", "rate_limited")]

    # the next request skips Groq without calling it, and says so
    _, meta2 = await llm.complete(task="ask", group="smart", messages=MSG)
    assert [(h.provider, h.reason) for h in meta2.fallbacks] == [("Groq", "cooling_down")]
    assert provider.models().count("groq/openai/gpt-oss-120b") == 1


async def test_retry_after_and_auth_failures_set_cooldowns() -> None:
    llm, _, _ = make_client(
        {"groq-fast": [rate_limited("120")], "cerebras": [bad_key()], "gemini-lite": ["ok"]}
    )
    await llm.complete(task="mood", group="fast", messages=MSG)
    assert 110 < llm.health.cooldown_left_s("groq-fast") <= 120
    assert llm.health.cooldown_left_s("cerebras") > 3500  # a broken key waits for a human


async def test_every_model_failing_is_a_friendly_503() -> None:
    llm, _, log = make_client(
        {"groq-fast": [outage()], "cerebras": [rate_limited()], "gemini-lite": [outage()]}
    )
    with pytest.raises(AppError) as err:
        await llm.complete(task="mood", group="fast", messages=MSG)
    assert err.value.code is ErrorCode.AI_UNAVAILABLE
    assert [a.ok for a in log.attempts] == [False, False, False]


async def test_no_keys_at_all_fails_fast() -> None:
    llm, provider, _ = make_client({}, groq="", cerebras="", gemini="")
    assert not llm.configured
    with pytest.raises(AppError):
        await llm.complete(task="mood", group="fast", messages=MSG)
    assert provider.calls == []


class Mood(BaseModel):
    moods: list[str]
    max_minutes: int | None = None


async def test_json_answers_are_validated_and_bad_output_falls_back_without_cooldown() -> None:
    fenced = '```json\n{"moods": ["cozy"], "max_minutes": 120}\n```'
    llm, provider, _ = make_client({"groq-fast": ["Sure! Here you go: not json"], "cerebras": [fenced]})
    value, meta = await llm.complete_json(Mood, task="mood", group="fast", messages=MSG)
    assert value == Mood(moods=["cozy"], max_minutes=120)
    assert [h.reason for h in meta.fallbacks] == [FailureKind.BAD_OUTPUT.value]
    assert not llm.health.is_cooling("groq-fast")  # a bad answer isn't an outage
    assert provider.calls[0][1]["response_format"] == {"type": "json_object"}


async def test_json_mode_is_not_sent_to_providers_without_it() -> None:
    llm, provider, _ = make_client(
        {
            "groq-fast": [outage()],
            "cerebras": [outage()],
            "gemini-lite": [outage()],
            "mistral": [outage()],
            "openrouter": ['{"moods": []}'],
        },
        mistral="k",
        openrouter="k",
    )
    _, meta = await llm.complete_json(Mood, task="mood", group="fast", messages=MSG)
    assert meta.provider == "OpenRouter"
    assert "response_format" not in provider.calls[-1][1]


async def test_streaming_falls_back_before_the_first_token() -> None:
    llm, _, log = make_client(
        {"groq-smart": [rate_limited()], "cerebras": [["", "Once ", "upon ", "a time."]]}
    )
    events = [e async for e in llm.stream(task="ask", group="smart", messages=MSG)]
    tokens = [e.text for e in events if isinstance(e, StreamToken)]
    done = events[-1]
    assert "".join(tokens) == "Once upon a time."
    assert isinstance(done, StreamDone) and done.meta.provider == "Cerebras"
    assert [h.reason for h in done.meta.fallbacks] == ["rate_limited"]
    assert [a.ok for a in log.attempts] == [False, True]


async def test_a_stream_cut_mid_answer_is_reported_not_silently_retried() -> None:
    llm, _, _ = make_client({"groq-smart": [["Half an ", outage()]]})
    received: list[str] = []
    with pytest.raises(AppError) as err:
        async for e in llm.stream(task="ask", group="smart", messages=MSG):
            if isinstance(e, StreamToken):
                received.append(e.text)
    assert received == ["Half an "]
    assert err.value.code is ErrorCode.AI_UNAVAILABLE


async def test_cached_answers_cost_no_quota() -> None:
    llm, provider, log = make_client({"gemini": ["A gothic tale of ambition."]})
    llm._cache = FakeCache()  # type: ignore[assignment]
    first, _ = await llm.complete(task="summary", group="long", messages=MSG, cache_ttl_s=3600)
    second, meta = await llm.complete(task="summary", group="long", messages=MSG, cache_ttl_s=3600)
    assert first == second and meta.cached and meta.provider == "Google Gemini"
    assert len(provider.calls) == 1
    assert log.attempts[-1].cached is True


@pytest.mark.parametrize(
    ("exc", "kind"),
    [
        (rate_limited(), FailureKind.RATE_LIMITED),
        (bad_key(), FailureKind.AUTH),
        (llm_errors.Timeout("slow", model="m", llm_provider="x"), FailureKind.TIMEOUT),
        (llm_errors.BadRequestError("bad", model="m", llm_provider="x"), FailureKind.BAD_REQUEST),
        (outage(), FailureKind.UNAVAILABLE),
        (llm_errors.APIConnectionError("no route", llm_provider="x", model="m"), FailureKind.UNAVAILABLE),
        (ValueError("?"), FailureKind.UNKNOWN),
    ],
)
def test_failure_classification(exc: Exception, kind: FailureKind) -> None:
    assert classify(exc) is kind


def test_parse_json_tolerates_chatter_but_not_garbage() -> None:
    assert parse_json('Here: {"moods": ["dark"]} hope that helps', Mood).moods == ["dark"]
    with pytest.raises(InvalidOutput):
        parse_json('{"moods": "dark"', Mood)
    with pytest.raises(InvalidOutput):
        parse_json('{"wrong": 1}', Mood)
