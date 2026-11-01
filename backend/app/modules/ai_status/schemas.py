from datetime import datetime
from typing import Literal

from app.core.schemas import ApiModel

ProviderState = Literal["ready", "cooling", "missing_key"]
Overall = Literal["online", "degraded", "offline", "not_configured"]


class ProviderStatus(ApiModel):
    id: str
    provider: str
    model: str
    groups: list[str]
    state: ProviderState
    cooldown_s: int | None = None
    last_failure: str | None = None
    # over the status window (window_hours)
    calls: int = 0
    failures: int = 0
    p50_latency_ms: int | None = None
    last_used_at: datetime | None = None


class ChainStatus(ApiModel):
    group: str
    label: str
    purpose: str
    deployments: list[str]
    ready: int


class Totals(ApiModel):
    requests: int
    answered: int
    fallbacks: int
    cache_hits: int
    avg_latency_ms: int | None
    success_rate: float | None


class RecentCall(ApiModel):
    at: datetime
    task: str
    provider: str
    model: str
    ok: bool
    failure: str | None = None
    latency_ms: int
    fallback: bool
    cached: bool


class AiStatus(ApiModel):
    overall: Overall
    providers: list[ProviderStatus]
    chains: list[ChainStatus]
    window_hours: int
    totals: Totals
    recent: list[RecentCall]
    embedding_model: str
    generated_at: datetime
