"""Rate limits, the daily AI allowance and security headers."""

from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.ai.llm.quota import DailyQuota
from app.core.config import Settings
from app.core.errors import AppError, ErrorCode, register_error_handlers
from app.core.rate_limit import RateLimiter, TooManyRequests, limit
from app.core.security_headers import SecurityHeadersMiddleware


def test_sliding_window_allows_then_refuses_then_recovers(monkeypatch: Any) -> None:
    clock = [1000.0]
    monkeypatch.setattr("app.core.rate_limit.time.monotonic", lambda: clock[0])
    limiter = RateLimiter()
    for _ in range(3):
        limiter.hit("auth", "ip:1", 3, 60)
    with pytest.raises(TooManyRequests) as refused:
        limiter.hit("auth", "ip:1", 3, 60)
    assert refused.value.retry_after == 60
    limiter.hit("auth", "ip:2", 3, 60)  # another client has its own window
    limiter.hit("forms", "ip:1", 3, 60)  # and so does another bucket
    clock[0] += 61
    limiter.hit("auth", "ip:1", 3, 60)


def test_disabled_limiter_never_refuses() -> None:
    limiter = RateLimiter(enabled=False)
    for _ in range(100):
        limiter.hit("auth", "ip:1", 1, 60)


def _app(**limiter: Any) -> FastAPI:
    app = FastAPI()
    register_error_handlers(app)
    app.state.limiter = RateLimiter(**limiter)

    @app.get("/x", dependencies=[limit("x", 2, 60)])
    async def x() -> dict[str, bool]:
        return {"ok": True}

    return app


def test_429_has_the_error_envelope_and_retry_after() -> None:
    client = TestClient(_app())
    assert [client.get("/x").status_code for _ in range(2)] == [200, 200]
    res = client.get("/x")
    assert res.status_code == 429 and res.headers["retry-after"] == "60"
    assert res.json()["error"]["code"] == "RATE_LIMITED"


def test_clients_are_told_apart_by_token_or_forwarded_ip() -> None:
    client = TestClient(_app(trust_proxy=True))
    for who in (
        {"Authorization": "Bearer a"},
        {"Authorization": "Bearer b"},
        {"X-Forwarded-For": "9.9.9.9, 10.0.0.1"},
    ):
        assert [client.get("/x", headers=who).status_code for _ in range(2)] == [200, 200]


def test_daily_quota_counts_per_reader_and_ignores_anonymous() -> None:
    quota = DailyQuota(2)
    for _ in range(2):
        quota.check("u1")
        quota.spend("u1")
    with pytest.raises(AppError) as spent:
        quota.check("u1")
    assert spent.value.code is ErrorCode.RATE_LIMITED and "2 AI answers" in spent.value.message
    quota.check("u2")
    quota.check(None)  # anonymous calls (the help bubble) are limited per request instead
    unlimited = DailyQuota(0)
    unlimited.spend("u1")
    unlimited.check("u1")


@pytest.mark.parametrize("production", [False, True])
def test_security_headers(production: bool) -> None:
    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware, production=production)

    @app.get("/x")
    async def x() -> dict[str, bool]:
        return {"ok": True}

    headers = TestClient(app).get("/x").headers
    assert headers["x-content-type-options"] == "nosniff" and headers["x-frame-options"] == "DENY"
    assert ("strict-transport-security" in headers) is production
    assert ("content-security-policy" in headers) is production


def test_settings_switches_default_to_safe() -> None:
    s = Settings(_env_file=None)  # type: ignore[call-arg]
    assert s.rate_limits is True and s.trust_proxy_headers is False
