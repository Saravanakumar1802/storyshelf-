"""The real call log, the response cache and the public status endpoint, on the test database."""

import pytest
from fastapi import FastAPI
from httpx import AsyncClient

from app.ai.cache import AiCache
from app.ai.llm.client import build_llm
from app.ai.llm.telemetry import Attempt, CallLog
from app.core.config import Settings
from app.db.mongo import Database

pytestmark = pytest.mark.integration

KEY_FIELDS = (
    "groq_api_key",
    "gemini_api_key",
    "cerebras_api_key",
    "mistral_api_key",
    "github_models_token",
    "openrouter_api_key",
)


async def test_cache_roundtrip(it_db: Database) -> None:
    cache = AiCache(it_db)
    await cache.put("k1", text="answer", provider="Groq", model="m", ttl_s=60)
    hit = await cache.get("k1")
    assert hit is not None and hit["text"] == "answer"
    await cache.put("k2", text="old", provider="Groq", model="m", ttl_s=-1)  # already expired
    assert await cache.get("k2") is None


async def test_status_reports_configuration_usage_and_recent_calls(
    it_db: Database, it_app: FastAPI, api: AsyncClient, it_settings: Settings
) -> None:
    calls = CallLog(it_db)
    for a in [
        Attempt(
            "r1",
            "ask",
            "smart",
            "groq-smart",
            "Groq",
            "gpt-oss-120b",
            ok=False,
            latency_ms=40,
            failure="rate_limited",
        ),
        Attempt(
            "r1",
            "ask",
            "smart",
            "cerebras",
            "Cerebras",
            "gpt-oss-120b",
            ok=True,
            latency_ms=600,
            fallback=True,
        ),
        Attempt("r2", "mood", "fast", "cerebras", "Cerebras", "gpt-oss-120b", ok=True, latency_ms=200),
        Attempt(
            "r3",
            "summary",
            "long",
            "cache",
            "Google Gemini",
            "gemini-2.5-flash",
            ok=True,
            latency_ms=0,
            cached=True,
        ),
    ]:
        calls.record(a)
    await calls.flush()
    it_app.state.ai_status = None  # drop the endpoint's short cache

    # other tests may have wired in a scripted model; this one checks the key-less app
    keyless = it_settings.model_copy(update=dict.fromkeys(KEY_FIELDS))
    saved, it_app.state.llm = it_app.state.llm, build_llm(keyless, it_db)
    try:
        res = await api.get("/api/v1/ai/status")
    finally:
        it_app.state.llm = saved
    assert res.status_code == 200
    body = res.json()

    # the test app has no LLM keys: everything reads "missing_key", and nothing leaks (no prompts, no users)
    assert body["overall"] == "not_configured"
    assert {p["state"] for p in body["providers"]} == {"missing_key"}
    assert [c["group"] for c in body["chains"]] == ["fast", "smart", "long"]

    cerebras = next(p for p in body["providers"] if p["id"] == "cerebras")
    assert cerebras["calls"] == 2 and cerebras["failures"] == 0 and cerebras["p50LatencyMs"] == 400
    assert set(cerebras["groups"]) == {"fast", "smart"}

    assert body["windowHours"] == 24
    totals = body["totals"]
    assert totals["requests"] == 3 and totals["fallbacks"] == 1 and totals["cacheHits"] == 1
    assert totals["successRate"] == 1.0

    recent = body["recent"]
    # writes are fire-and-forget (concurrent), so assert on content, not order
    assert len(recent) == 4 and sum(r["cached"] for r in recent) == 1
    assert recent == sorted(recent, key=lambda r: r["at"], reverse=True)
    assert "userId" not in recent[0] and "requestId" not in recent[0]
