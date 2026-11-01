import time
from datetime import UTC, datetime
from typing import Any

from app.ai.llm.client import LlmClient
from app.ai.llm.providers import CHAINS, GROUPS
from app.ai.llm.telemetry import CallLog, since_hours
from app.modules.ai_status.schemas import (
    AiStatus,
    ChainStatus,
    Overall,
    ProviderState,
    ProviderStatus,
    RecentCall,
    Totals,
)

_CHAIN_COPY = {
    "fast": ("Fast", "Mood parsing, search rewriting, tags: quick jobs with high daily limits."),
    "smart": ("Smart", "Answers you read: Ask My Library and recommendation reasons."),
    "long": ("Long-context", "Whole-book summaries that need a very large context window."),
}
# the panel is public and polled; a short cache keeps it from becoming a database load
_TTL_S = 10.0
WINDOW_HOURS = 24


class AiStatusService:
    def __init__(self, llm: LlmClient, calls: CallLog, embedding_model: str) -> None:
        self.llm = llm
        self.calls = calls
        self.embedding_model = embedding_model
        self._cached: tuple[float, AiStatus] | None = None

    async def status(self) -> AiStatus:
        if self._cached and time.monotonic() - self._cached[0] < _TTL_S:
            return self._cached[1]
        since = since_hours(WINDOW_HOURS)
        usage = await self.calls.per_deployment(since)
        providers = [self._provider(d_id, usage.get(d_id, {})) for d_id in self.llm.deployments]
        states = {p.id: p.state for p in providers}
        chains = [
            ChainStatus(
                group=g,
                label=_CHAIN_COPY[g][0],
                purpose=_CHAIN_COPY[g][1],
                deployments=list(CHAINS[g]),
                ready=sum(states[i] == "ready" for i in CHAINS[g]),
            )
            for g in GROUPS
        ]
        status = AiStatus(
            overall=self._overall(providers, chains),
            providers=providers,
            chains=chains,
            window_hours=WINDOW_HOURS,
            totals=Totals(**await self.calls.totals(since)),
            recent=[RecentCall(**r) for r in await self.calls.recent()],
            embedding_model=self.embedding_model,
            generated_at=datetime.now(UTC),
        )
        self._cached = (time.monotonic(), status)
        return status

    def _provider(self, deployment_id: str, usage: dict[str, Any]) -> ProviderStatus:
        d = self.llm.deployments[deployment_id]
        health = self.llm.health.get(deployment_id)
        state: ProviderState
        if not d.configured:
            state = "missing_key"
        elif self.llm.health.is_cooling(deployment_id):
            state = "cooling"
        else:
            state = "ready"
        cooldown = self.llm.health.cooldown_left_s(deployment_id)
        return ProviderStatus(
            id=d.id,
            provider=d.provider,
            model=d.model_name,
            groups=[g for g in GROUPS if deployment_id in CHAINS[g]],
            state=state,
            cooldown_s=round(cooldown) if state == "cooling" else None,
            last_failure=health.last_failure.value if health.last_failure else None,
            calls=int(usage.get("calls", 0)),
            failures=int(usage.get("failures", 0)),
            p50_latency_ms=usage.get("p50_latency_ms"),
            last_used_at=usage.get("last_used_at"),
        )

    @staticmethod
    def _overall(providers: list[ProviderStatus], chains: list[ChainStatus]) -> Overall:
        if all(p.state == "missing_key" for p in providers):
            return "not_configured"
        if all(c.ready == 0 for c in chains):
            return "offline"
        if any(c.ready == 0 for c in chains) or any(p.state == "cooling" for p in providers):
            return "degraded"
        return "online"
