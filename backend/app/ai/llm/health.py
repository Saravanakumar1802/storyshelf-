"""
A circuit breaker per deployment.

When a model fails, the reason decides how long we stop asking it:
- quota or rate limit: a minute (or whatever the provider's Retry-After says);
- bad key or no access: an hour, because a person has to fix it;
- outages and timeouts: half a minute.

Skipping a cooling deployment saves the request a pointless round trip and
spares the provider's free quota. The state is in memory: one API process
holds it, and a restart simply starts every model fresh.
"""

import time
from dataclasses import dataclass, field
from enum import StrEnum

from litellm import exceptions as llm_errors


class FailureKind(StrEnum):
    RATE_LIMITED = "rate_limited"
    AUTH = "auth"
    UNAVAILABLE = "unavailable"
    TIMEOUT = "timeout"
    BAD_REQUEST = "bad_request"
    BAD_OUTPUT = "bad_output"  # answered, but not in the shape we asked for
    UNKNOWN = "unknown"


COOLDOWN_S: dict[FailureKind, float] = {
    FailureKind.RATE_LIMITED: 60,
    FailureKind.AUTH: 3600,
    FailureKind.UNAVAILABLE: 30,
    FailureKind.TIMEOUT: 30,
    FailureKind.BAD_REQUEST: 0,  # our prompt's fault, not the model's: don't punish it
    FailureKind.BAD_OUTPUT: 0,
    FailureKind.UNKNOWN: 30,
}
_MAX_RETRY_AFTER_S = 600


def classify(exc: BaseException) -> FailureKind:
    # order matters: Timeout subclasses APIConnectionError, ContextWindowExceeded subclasses BadRequest
    if isinstance(exc, llm_errors.RateLimitError):
        return FailureKind.RATE_LIMITED
    if isinstance(exc, llm_errors.AuthenticationError | llm_errors.PermissionDeniedError):
        return FailureKind.AUTH
    if isinstance(exc, llm_errors.Timeout):
        return FailureKind.TIMEOUT
    if isinstance(exc, llm_errors.BadRequestError | llm_errors.NotFoundError):
        return FailureKind.BAD_REQUEST
    if isinstance(
        exc,
        llm_errors.ServiceUnavailableError | llm_errors.InternalServerError | llm_errors.APIConnectionError,
    ):
        return FailureKind.UNAVAILABLE
    return FailureKind.UNKNOWN


def retry_after_s(exc: BaseException) -> float | None:
    headers = getattr(exc, "headers", None) or {}
    try:
        value = float(headers.get("retry-after") or headers.get("Retry-After") or "")
    except (TypeError, ValueError):
        return None
    return min(max(value, 1.0), _MAX_RETRY_AFTER_S)


@dataclass
class DeploymentHealth:
    cooling_until: float = 0.0
    last_failure: FailureKind | None = None
    last_failure_at: float | None = None
    last_success_at: float | None = None


@dataclass
class HealthBook:
    _state: dict[str, DeploymentHealth] = field(default_factory=dict)

    def get(self, deployment_id: str) -> DeploymentHealth:
        return self._state.setdefault(deployment_id, DeploymentHealth())

    def is_cooling(self, deployment_id: str, now: float | None = None) -> bool:
        return self.get(deployment_id).cooling_until > (now or time.monotonic())

    def cooldown_left_s(self, deployment_id: str) -> float:
        return max(0.0, self.get(deployment_id).cooling_until - time.monotonic())

    def record_success(self, deployment_id: str) -> None:
        h = self.get(deployment_id)
        h.last_success_at = time.time()
        h.cooling_until = 0.0

    def record_failure(self, deployment_id: str, kind: FailureKind, retry_after: float | None = None) -> None:
        h = self.get(deployment_id)
        h.last_failure, h.last_failure_at = kind, time.time()
        seconds = retry_after if kind is FailureKind.RATE_LIMITED and retry_after else COOLDOWN_S[kind]
        if seconds:
            h.cooling_until = time.monotonic() + seconds
