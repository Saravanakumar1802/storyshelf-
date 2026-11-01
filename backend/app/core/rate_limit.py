"""
Request rate limits: a sliding window per client and bucket, kept in memory
(one API process; a restart clears them, which is harmless).

    @router.post("/login", dependencies=[limit("auth", 10, 60)])

The client is the signed-in account when there is a bearer token, otherwise
the IP address (the first X-Forwarded-For hop when TRUST_PROXY_HEADERS is on,
because hosts like Render put a proxy in front). Over the limit, the API
answers 429 with Retry-After and the usual error envelope.
"""

import hashlib
import math
import time
from collections import defaultdict, deque
from typing import Any

from fastapi import Depends, Request

from app.core.errors import AppError, ErrorCode

_MAX_KEYS = 50_000


class TooManyRequests(AppError):
    def __init__(self, retry_after: int) -> None:
        super().__init__(
            ErrorCode.RATE_LIMITED, "That's a lot of requests at once. Please wait a moment and try again."
        )
        self.retry_after = retry_after


class RateLimiter:
    def __init__(self, *, enabled: bool = True, trust_proxy: bool = False) -> None:
        self.enabled = enabled
        self.trust_proxy = trust_proxy
        self._hits: defaultdict[str, deque[float]] = defaultdict(deque)

    def client_key(self, request: Request) -> str:
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            # hashed: the limiter never holds tokens
            return "t:" + hashlib.sha256(auth[7:].strip().encode()).hexdigest()[:24]
        if self.trust_proxy and (fwd := request.headers.get("x-forwarded-for")):
            return "ip:" + fwd.split(",")[0].strip()
        return "ip:" + (request.client.host if request.client else "unknown")

    def hit(self, bucket: str, key: str, times: int, per_s: float) -> None:
        if not self.enabled:
            return
        now = time.monotonic()
        window = self._hits[f"{bucket}|{key}"]
        while window and now - window[0] >= per_s:
            window.popleft()
        if len(window) >= times:
            raise TooManyRequests(max(1, math.ceil(per_s - (now - window[0]))))
        window.append(now)
        if len(self._hits) > _MAX_KEYS:  # under a flood of distinct clients, forget the idle ones
            for k in [k for k, w in self._hits.items() if not w or now - w[-1] >= per_s]:
                del self._hits[k]


def limit(bucket: str, times: int, per_s: float) -> Any:
    """A route dependency allowing `times` requests per `per_s` seconds per client."""

    async def check(request: Request) -> None:
        limiter: RateLimiter = request.app.state.limiter
        limiter.hit(bucket, limiter.client_key(request), times, per_s)

    return Depends(check)
