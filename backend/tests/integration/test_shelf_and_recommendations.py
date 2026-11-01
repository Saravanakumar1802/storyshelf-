"""My Library shelves, reading progress and both recommendation flows, through the API."""

from typing import Any

import pytest
from fastapi import FastAPI
from httpx import AsyncClient

from app.ai.llm.client import LlmClient

pytestmark = pytest.mark.integration


async def test_shelves_require_sign_in(api: AsyncClient, ai_shelf: dict[str, Any]) -> None:
    assert (await api.get("/api/v1/library/shelf")).status_code == 401
    assert (
        await api.put(f"/api/v1/library/shelf/{ai_shelf['desert']}", json={"status": "want"})
    ).status_code == 401


async def test_shelf_lifecycle_and_progress(
    api: AsyncClient, ai_shelf: dict[str, Any], demo_auth: dict[str, str]
) -> None:
    slug = ai_shelf["lighthouse"]
    put = await api.put(f"/api/v1/library/shelf/{slug}", json={"status": "want"}, headers=demo_auth)
    assert put.status_code == 200 and put.json()["status"] == "want" and put.json()["progress"] == 0

    detail = (await api.get(f"/api/v1/books/{slug}")).json()
    last = detail["chapterCount"] - 1

    reading = (
        await api.put(f"/api/v1/library/progress/{slug}", json={"chapter": 1}, headers=demo_auth)
    ).json()
    assert reading["status"] == "reading" and reading["chapter"] == 1

    finished = (
        await api.put(f"/api/v1/library/progress/{slug}", json={"chapter": 99}, headers=demo_auth)
    ).json()
    assert finished["status"] == "finished" and finished["chapter"] == last and finished["progress"] == 1.0

    # re-reading an early chapter keeps it finished
    again = (await api.put(f"/api/v1/library/progress/{slug}", json={"chapter": 0}, headers=demo_auth)).json()
    assert again["status"] == "finished"

    shelf = (await api.get("/api/v1/library/shelf", headers=demo_auth)).json()
    assert [i["book"]["slug"] for i in shelf] == [slug]

    assert (await api.delete(f"/api/v1/library/shelf/{slug}", headers=demo_auth)).status_code == 204
    assert (await api.get("/api/v1/library/shelf", headers=demo_auth)).json() == []
    missing = await api.put("/api/v1/library/shelf/no-such-book", json={"status": "want"}, headers=demo_auth)
    assert missing.status_code == 404


async def test_because_you_read(
    api: AsyncClient, ai_shelf: dict[str, Any], demo_auth: dict[str, str]
) -> None:
    empty = (await api.get("/api/v1/recommendations/for-me", headers=demo_auth)).json()
    assert empty["items"] == [] and empty["note"]

    await api.put(
        f"/api/v1/library/shelf/{ai_shelf['desert']}", json={"status": "finished"}, headers=demo_auth
    )
    recs = (await api.get("/api/v1/recommendations/for-me", headers=demo_auth)).json()
    assert [r["book"]["slug"] for r in recs["items"]] == [
        ai_shelf["lighthouse"]
    ]  # never a book already shelved
    pick = recs["items"][0]
    assert pick["aiWritten"] is True and pick["reason"].startswith("Because it suits you")
    assert pick["because"] == "The Salt Caravan"
    assert recs["basis"] == ["The Salt Caravan"] and recs["meta"]["task"] == "recommend"
    await api.delete(f"/api/v1/library/shelf/{ai_shelf['desert']}", headers=demo_auth)


async def test_recommendations_without_any_model_still_work(
    api: AsyncClient, it_app: FastAPI, ai_shelf: dict[str, Any], demo_auth: dict[str, str]
) -> None:
    configured = it_app.state.llm
    it_app.state.llm = LlmClient(
        {k: d.__class__(d.id, d.provider, d.model, None) for k, d in configured.deployments.items()}
    )
    try:
        await api.put(
            f"/api/v1/library/shelf/{ai_shelf['desert']}", json={"status": "reading"}, headers=demo_auth
        )
        recs = (await api.get("/api/v1/recommendations/for-me", headers=demo_auth)).json()
        assert recs["meta"] is None
        assert recs["items"][0]["reason"] == "Close in spirit to The Salt Caravan."
        assert recs["items"][0]["aiWritten"] is False

        mood = (
            await api.post(
                "/api/v1/recommendations/mood", json={"text": "something short and sad by the sea"}
            )
        ).json()
        assert mood["parseMeta"] is None and mood["meta"] is None
        assert "melancholic" in mood["interpreted"]["moods"] and mood["interpreted"]["maxMinutes"] == 180
        assert mood["items"]
    finally:
        it_app.state.llm = configured
        await api.delete(f"/api/v1/library/shelf/{ai_shelf['desert']}", headers=demo_auth)


async def test_mood_recommendations(api: AsyncClient, ai_shelf: dict[str, Any]) -> None:
    res = await api.post(
        "/api/v1/recommendations/mood", json={"moods": ["reflective"], "text": "a lonely lighthouse"}
    )
    assert res.status_code == 200
    body = res.json()
    assert body["interpreted"]["searchText"] == "a lonely lighthouse by the sea"
    assert body["interpreted"]["moods"] == ["reflective", "melancholic"]
    assert body["parseMeta"]["task"] == "mood" and body["meta"]["task"] == "mood"
    assert body["items"][0]["book"]["slug"] == ai_shelf["lighthouse"]
    assert body["items"][0]["aiWritten"] is True

    bad = await api.post("/api/v1/recommendations/mood", json={"moods": ["sleepy"]})
    assert bad.status_code == 422
    assert "reflective" in (await api.get("/api/v1/recommendations/moods")).json()
