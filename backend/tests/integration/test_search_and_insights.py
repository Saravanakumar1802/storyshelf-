"""
Semantic search, similar books and AI insights end to end, through the API and the test database.

The real embedding model and LLMs are swapped for deterministic stand-ins:
a bag-of-words hashing embedder (texts sharing words get similar vectors) and
a scripted LLM. Everything else is the production code path.
"""

from typing import Any

import pytest
from fastapi import FastAPI
from httpx import AsyncClient

from app.db.mongo import Database
from app.modules.insights.service import enrich_book

pytestmark = pytest.mark.integration


async def test_semantic_search_finds_the_book_and_the_passage(
    api: AsyncClient, ai_shelf: dict[str, Any]
) -> None:
    res = await api.get("/api/v1/search", params={"q": "the lighthouse keeper and the fog horn at sea"})
    assert res.status_code == 200
    body = res.json()
    assert body["mode"] == "semantic"
    top = body["items"][0]
    assert top["book"]["slug"] == ai_shelf["lighthouse"]
    assert "passage" in top["matchedBy"]
    assert top["passage"]["excerpt"] and top["passage"]["chapterTitle"]

    desert = (await api.get("/api/v1/search", params={"q": "a caravan of camels in a sandstorm"})).json()
    assert desert["items"][0]["book"]["slug"] == ai_shelf["desert"]


async def test_search_respects_genre_and_validates_input(api: AsyncClient, ai_shelf: dict[str, Any]) -> None:
    none = (await api.get("/api/v1/search", params={"q": "lighthouse", "genre": "Poetry"})).json()
    assert none["items"] == []
    assert (await api.get("/api/v1/search", params={"q": "x"})).status_code == 422


async def test_similar_books(api: AsyncClient, ai_shelf: dict[str, Any]) -> None:
    res = await api.get(f"/api/v1/books/{ai_shelf['lighthouse']}/similar")
    assert res.status_code == 200
    slugs = [b["slug"] for b in res.json()]
    assert ai_shelf["lighthouse"] not in slugs and ai_shelf["desert"] in slugs
    assert (await api.get("/api/v1/books/nope/similar")).status_code == 404


async def test_chapter_summary_needs_sign_in_then_is_generated_once(
    api: AsyncClient, ai_shelf: dict[str, Any], demo_auth: dict[str, str]
) -> None:
    url = f"/api/v1/books/{ai_shelf['lighthouse']}/chapters/0/summary"
    assert (await api.post(url)).status_code == 401

    first = await api.post(url, headers=demo_auth)
    assert first.status_code == 200, first.text
    body = first.json()
    assert body["keyMoments"] == ["The evening climb", "The logbook"]
    assert body["meta"]["provider"] == "Google Gemini"
    calls = ai_shelf["llm_calls"].calls

    again = await api.post(url, headers=demo_auth)
    assert again.json()["summary"] == body["summary"]
    assert ai_shelf["llm_calls"].calls == calls  # stored: no second model call

    chapter = (await api.get(f"/api/v1/books/{ai_shelf['lighthouse']}/chapters/0")).json()
    assert chapter["ai"]["summary"] == body["summary"]


async def test_book_enrichment_is_stored_and_served(
    it_db: Database, it_app: FastAPI, api: AsyncClient, ai_shelf: dict[str, Any]
) -> None:
    book = await it_db.books.find_one({"slug": ai_shelf["lighthouse"]})
    assert book is not None
    ai = await enrich_book(it_db, it_app.state.llm, it_app.state.embedder, book)
    assert ai.moods == ["melancholic", "reflective"]  # the unknown mood was dropped, not fatal

    detail = (await api.get(f"/api/v1/books/{ai_shelf['lighthouse']}")).json()
    assert detail["ai"]["hook"].startswith("Every light")
    assert detail["ai"]["readingLevel"] == "easy"
    assert detail["ai"]["meta"]["model"] == "gemini-2.5-flash"
