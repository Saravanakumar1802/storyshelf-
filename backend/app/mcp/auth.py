"""
Who is calling the MCP server: a personal access token in the Authorization header.

    Authorization: Bearer ssk_…

The guard turns away calls without a valid token before they reach the MCP
transport (a plain 401, so the client shows a clear error), and tools look
the caller up again from the same header. Lookups are cached for a minute,
so a busy assistant costs one database read a minute, and a revoked token
stops working within that minute.
"""

import json
import time
from collections.abc import Callable, Mapping

from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.rate_limit import RateLimiter, TooManyRequests
from app.core.security import sha256
from app.db.mongo import mongo
from app.modules.tokens.service import TokensService
from app.modules.users.schemas import UserPublic

CACHE_S = 60.0
_MAX_CACHED = 1_000


def bearer(headers: Mapping[str, str] | None) -> str | None:
    value = (headers or {}).get("authorization", "")
    scheme, _, token = value.partition(" ")
    return token.strip() if scheme.lower() == "bearer" and token.strip() else None


class TokenResolver:
    def __init__(self) -> None:
        self._cache: dict[str, tuple[float, UserPublic | None]] = {}

    async def user(self, token: str | None) -> UserPublic | None:
        if not token:
            return None
        now = time.monotonic()
        hit = self._cache.get(token)
        if hit and now - hit[0] < CACHE_S:
            return hit[1]
        user = await TokensService(mongo.db).authenticate(token)
        if len(self._cache) >= _MAX_CACHED:
            self._cache.clear()
        self._cache[token] = (now, user)
        return user


MCP_CALLS_PER_MINUTE = 120


async def _deny(send: Send, status: int, code: str, message: str, headers: list[tuple[bytes, bytes]]) -> None:
    body = json.dumps({"error": {"code": code, "message": message}}).encode()
    await send(
        {
            "type": "http.response.start",
            "status": status,
            "headers": [(b"content-type", b"application/json"), *headers],
        }
    )
    await send({"type": "http.response.body", "body": body})


class TokenGuard:
    """ASGI wrapper around the MCP app: no valid token, no entry; and no flood from one token."""

    def __init__(self, app: ASGIApp, resolver: TokenResolver, limiter: Callable[[], RateLimiter]) -> None:
        self.app = app
        self.resolver = resolver
        self.limiter = limiter

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        headers = {k.decode("latin-1"): v.decode("latin-1") for k, v in scope["headers"]}
        token = bearer(headers)
        if await self.resolver.user(token) is None:
            await _deny(
                send,
                401,
                "UNAUTHORIZED",
                "Add a StoryShelf access token: Authorization: Bearer ssk_… "
                "(create one at /library/connect).",
                [(b"www-authenticate", b"Bearer")],
            )
            return
        try:
            self.limiter().hit("mcp", sha256(token or ""), MCP_CALLS_PER_MINUTE, 60)
        except TooManyRequests as exc:
            await _deny(
                send, 429, "RATE_LIMITED", exc.message, [(b"retry-after", str(exc.retry_after).encode())]
            )
            return
        await self.app(scope, receive, send)
