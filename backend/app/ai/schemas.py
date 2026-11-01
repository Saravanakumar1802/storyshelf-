from pydantic import Field

from app.core.schemas import ApiModel


class FallbackHop(ApiModel):
    """A model that was skipped or failed before the one that answered."""

    provider: str
    model: str
    reason: str  # "rate_limited", "cooling_down", "timeout", …


class AiMeta(ApiModel):
    """Attached to every AI answer, so the site can show exactly which model produced it."""

    task: str
    provider: str
    model: str
    latency_ms: int
    cached: bool = False
    fallbacks: list[FallbackHop] = Field(default_factory=list)
