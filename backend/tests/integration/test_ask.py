"""Ask My Library: threads, grounded streaming answers with citations, scoping and graceful failure."""

import json
from typing import Any

import pytest
from fastapi import FastAPI
from httpx import AsyncClient

from app.ai.llm.client import LlmClient

pytestmark = pytest.mark.integration


def events(body: str) -> list[tuple[str, Any]]:
    """Parses an SSE response body into (event, data) pairs."""
    out = []
    for block in body.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in block.splitlines())
        out.append((lines["event"], json.loads(lines["data"])))
    return out


async def _thread(api: AsyncClient, auth: dict[str, str], **body: Any) -> str:
    res = await api.post("/api/v1/ask/threads", json=body or {"scope": "shelf"}, headers=auth)
    assert res.status_code == 201, res.text
    return res.json()["id"]  # type: ignore[no-any-return]


async def test_an_empty_shelf_is_explained_not_errored(
    api: AsyncClient, ai_shelf: dict[str, Any], demo_auth: dict[str, str]
) -> None:
    tid = await _thread(api, demo_auth)
    res = await api.post(
        f"/api/v1/ask/threads/{tid}/messages", json={"question": "What happens?"}, headers=demo_auth
    )
    assert res.status_code == 409 and "shelves are empty" in res.json()["error"]["message"]


async def test_grounded_streaming_answer_with_citations(
    api: AsyncClient, ai_shelf: dict[str, Any], demo_auth: dict[str, str]
) -> None:
    await api.put(
        f"/api/v1/library/shelf/{ai_shelf['lighthouse']}", json={"status": "reading"}, headers=demo_auth
    )
    try:
        tid = await _thread(api, demo_auth)
        res = await api.post(
            f"/api/v1/ask/threads/{tid}/messages",
            json={"question": "What does the keeper do at dusk?"},
            headers=demo_auth,
        )
        assert res.status_code == 200 and res.headers["content-type"].startswith("text/event-stream")
        stream = events(res.text)
        kinds = [k for k, _ in stream]
        assert kinds[0] == "sources" and kinds[-1] == "done" and "token" in kinds

        sources = stream[0][1]
        assert sources and sources[0]["n"] == 1
        assert {s["book"]["slug"] for s in sources} == {ai_shelf["lighthouse"]}  # only the reader's shelf
        assert sources[0]["chapterTitle"] and sources[0]["excerpt"]
        answer = "".join(d for k, d in stream if k == "token")
        assert answer == "The keeper climbs the stair every evening [1]."
        assert stream[-1][1]["meta"]["task"] == "ask"

        thread = (await api.get(f"/api/v1/ask/threads/{tid}", headers=demo_auth)).json()
        assert thread["title"] == "What does the keeper do at dusk?"
        assert [m["role"] for m in thread["messages"]] == ["reader", "librarian"]
        assert thread["messages"][1]["content"] == answer and thread["messages"][1]["sources"]

        # a follow-up is rewritten into a standalone question before retrieval
        before = ai_shelf["llm_calls"].standalone_calls
        await api.post(
            f"/api/v1/ask/threads/{tid}/messages", json={"question": "Why does he?"}, headers=demo_auth
        )
        assert ai_shelf["llm_calls"].standalone_calls == before + 1
        assert len((await api.get(f"/api/v1/ask/threads/{tid}", headers=demo_auth)).json()["messages"]) == 4
    finally:
        await api.delete(f"/api/v1/library/shelf/{ai_shelf['lighthouse']}", headers=demo_auth)


async def test_a_book_thread_only_reads_that_book(
    api: AsyncClient, ai_shelf: dict[str, Any], demo_auth: dict[str, str]
) -> None:
    tid = await _thread(api, demo_auth, scope="book", book=ai_shelf["desert"])
    detail = (await api.get(f"/api/v1/ask/threads/{tid}", headers=demo_auth)).json()
    assert detail["book"]["title"] == "The Salt Caravan" and detail["title"] == "About The Salt Caravan"
    res = await api.post(
        f"/api/v1/ask/threads/{tid}/messages",
        json={"question": "lighthouse keeper at sea"},
        headers=demo_auth,
    )
    sources = events(res.text)[0][1]
    assert sources and {s["book"]["slug"] for s in sources} == {ai_shelf["desert"]}
    missing = await api.post("/api/v1/ask/threads", json={"scope": "book", "book": "nope"}, headers=demo_auth)
    assert missing.status_code == 404


async def test_with_every_model_resting_the_passages_still_arrive(
    api: AsyncClient, it_app: FastAPI, ai_shelf: dict[str, Any], demo_auth: dict[str, str]
) -> None:
    configured = it_app.state.llm
    it_app.state.llm = LlmClient(
        {k: d.__class__(d.id, d.provider, d.model, None) for k, d in configured.deployments.items()}
    )
    try:
        tid = await _thread(api, demo_auth, scope="book", book=ai_shelf["lighthouse"])
        res = await api.post(
            f"/api/v1/ask/threads/{tid}/messages", json={"question": "the fog horn"}, headers=demo_auth
        )
        stream = events(res.text)
        assert [k for k, _ in stream] == ["sources", "error"]
        assert stream[0][1] and stream[1][1]["code"] == "AI_UNAVAILABLE"
        saved = (await api.get(f"/api/v1/ask/threads/{tid}", headers=demo_auth)).json()["messages"][-1]
        assert saved["error"] and saved["sources"]
    finally:
        it_app.state.llm = configured


async def test_threads_are_private_and_deletable(
    api: AsyncClient, ai_shelf: dict[str, Any], demo_auth: dict[str, str]
) -> None:
    tid = await _thread(api, demo_auth)
    other = await api.post(
        "/api/v1/auth/signup",
        json={"name": "Other Reader", "email": "other-ask@example.com", "password": "readmore1"},
    )
    other_auth = {"Authorization": f"Bearer {other.json()['accessToken']}"}
    assert (await api.get(f"/api/v1/ask/threads/{tid}", headers=other_auth)).status_code == 404
    assert tid not in [t["id"] for t in (await api.get("/api/v1/ask/threads", headers=other_auth)).json()]
    assert (await api.delete(f"/api/v1/ask/threads/{tid}", headers=demo_auth)).status_code == 204
    assert (await api.get(f"/api/v1/ask/threads/{tid}", headers=demo_auth)).status_code == 404
    assert (
        await api.get("/api/v1/ask/threads/not-an-id-not-an-id-1234", headers=demo_auth)
    ).status_code == 404


async def test_a_spent_daily_allowance_still_returns_the_passages(
    api: AsyncClient, it_app: FastAPI, ai_shelf: dict[str, Any], demo_auth: dict[str, str]
) -> None:
    from app.ai.llm.quota import DailyQuota

    me = (await api.get("/api/v1/auth/me", headers=demo_auth)).json()
    llm: LlmClient = it_app.state.llm
    saved, llm.quota = llm.quota, DailyQuota(1)
    llm.quota.spend(me["id"])
    await api.put(
        f"/api/v1/library/shelf/{ai_shelf['lighthouse']}", json={"status": "reading"}, headers=demo_auth
    )
    try:
        tid = await _thread(api, demo_auth)
        res = await api.post(
            f"/api/v1/ask/threads/{tid}/messages",
            json={"question": "What does the keeper do?"},
            headers=demo_auth,
        )
        got = events(res.text)
        assert got[0][0] == "sources" and got[0][1]
        assert got[-1][0] == "error" and got[-1][1]["code"] == "RATE_LIMITED"
    finally:
        llm.quota = saved
        await api.delete(f"/api/v1/library/shelf/{ai_shelf['lighthouse']}", headers=demo_auth)
