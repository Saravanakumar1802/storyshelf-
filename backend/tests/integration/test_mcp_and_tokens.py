"""Personal access tokens and the MCP server, driven by the official MCP client over HTTP."""

import asyncio
from collections.abc import AsyncIterator
from contextlib import AbstractAsyncContextManager
from typing import Any

import httpx2
import pytest
from fastapi import FastAPI
from httpx import AsyncClient
from mcp import Client
from mcp.client.streamable_http import streamable_http_client
from mcp_types import TextContent

pytestmark = pytest.mark.integration


@pytest.fixture(scope="session")
async def mcp_running(it_app: FastAPI) -> AsyncIterator[None]:
    # the app's lifespan isn't run in tests, so start the MCP session manager here, in a
    # task of its own: anyio task groups must be exited by the task that entered them
    started, stop = asyncio.Event(), asyncio.Event()

    async def serve() -> None:
        async with it_app.state.mcp.session_manager.run():
            started.set()
            await stop.wait()

    task = asyncio.create_task(serve())
    await started.wait()
    yield
    stop.set()
    await task


def connect(app: FastAPI, token: str | None) -> AbstractAsyncContextManager[Any]:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    http = httpx2.AsyncClient(transport=httpx2.ASGITransport(app=app), base_url="http://it", headers=headers)
    return streamable_http_client("http://it/mcp", http_client=http)


async def _token(api: AsyncClient, auth: dict[str, str], name: str = "Claude Desktop") -> dict[str, Any]:
    res = await api.post("/api/v1/tokens", json={"name": name}, headers=auth)
    assert res.status_code == 201, res.text
    return res.json()  # type: ignore[no-any-return]


async def test_token_is_shown_once_and_can_be_revoked(api: AsyncClient, demo_auth: dict[str, str]) -> None:
    created = await _token(api, demo_auth)
    assert created["token"].startswith("ssk_") and created["prefix"] == created["token"][:12]

    listed = (await api.get("/api/v1/tokens", headers=demo_auth)).json()
    mine = next(t for t in listed if t["id"] == created["id"])
    assert "token" not in mine and mine["lastUsedAt"] is None

    assert (await api.delete(f"/api/v1/tokens/{created['id']}", headers=demo_auth)).status_code == 204
    again = await api.delete(f"/api/v1/tokens/{created['id']}", headers=demo_auth)
    assert again.status_code == 404


async def test_tokens_are_capped_per_reader(api: AsyncClient, demo_auth: dict[str, str]) -> None:
    made = [await _token(api, demo_auth, f"t{i}") for i in range(5)]
    try:
        res = await api.post("/api/v1/tokens", json={"name": "one too many"}, headers=demo_auth)
        assert res.status_code == 409
    finally:
        for t in made:
            await api.delete(f"/api/v1/tokens/{t['id']}", headers=demo_auth)


async def test_mcp_refuses_calls_without_a_valid_token(it_app: FastAPI, mcp_running: None) -> None:
    async with httpx2.AsyncClient(transport=httpx2.ASGITransport(app=it_app), base_url="http://it") as http:
        for headers in ({}, {"Authorization": "Bearer ssk_not-a-real-token"}):
            res = await http.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "ping"}, headers=headers)
            assert res.status_code == 401
            assert "access token" in res.json()["error"]["message"]


def _data(result: Any) -> dict[str, Any]:
    assert not result.is_error, result.content
    return result.structured_content  # type: ignore[no-any-return]


async def test_an_assistant_can_search_read_shelve_and_ask(
    api: AsyncClient,
    it_app: FastAPI,
    mcp_running: None,
    ai_shelf: dict[str, Any],
    demo_auth: dict[str, str],
) -> None:
    token = await _token(api, demo_auth)
    slug = ai_shelf["lighthouse"]
    try:
        async with Client(connect(it_app, token["token"])) as client:
            names = {t.name for t in (await client.list_tools()).tools}
            assert {
                "search_books",
                "get_book",
                "read_chapter",
                "recommend_by_mood",
                "recommend_for_me",
                "list_my_shelf",
                "add_to_shelf",
                "summarize_chapter",
                "ask_my_library",
                "import_gutenberg_book",
            } <= names

            found = _data(await client.call_tool("search_books", {"query": "the keeper climbs to the lamp"}))
            assert found["results"][0]["slug"] == slug

            book = _data(await client.call_tool("get_book", {"slug": slug}))
            assert book["contents"] and book["title"]

            chapter = _data(await client.call_tool("read_chapter", {"slug": slug, "chapter": 0}))
            assert chapter["text"] and chapter["truncated"] is False

            missing = await client.call_tool("get_book", {"slug": "no-such-book"})
            assert missing.is_error
            assert isinstance(missing.content[0], TextContent)
            assert "couldn't find" in missing.content[0].text

            shelved = _data(await client.call_tool("add_to_shelf", {"slug": slug, "status": "reading"}))
            assert shelved["status"] == "reading"
            shelf = _data(await client.call_tool("list_my_shelf", {}))
            assert [b["slug"] for b in shelf["shelf"]] == [slug]

            answer = _data(
                await client.call_tool("ask_my_library", {"question": "What does the keeper do at dusk?"})
            )
            assert answer["sources"] and answer["sources"][0]["book"]

            denied = await client.call_tool("import_gutenberg_book", {"gutenberg_id": 84})
            assert denied.is_error

            overview = await client.read_resource(f"book://{slug}")
            assert "## Contents" in overview.contents[0].text  # type: ignore[union-attr]

        # the token records its last use, and the question shows up in Ask My Library
        listed = (await api.get("/api/v1/tokens", headers=demo_auth)).json()
        assert next(t for t in listed if t["id"] == token["id"])["lastUsedAt"] is not None
        threads = (await api.get("/api/v1/ask/threads", headers=demo_auth)).json()
        assert threads[0]["title"].startswith("What does the keeper")
    finally:
        await api.delete(f"/api/v1/library/shelf/{slug}", headers=demo_auth)
        await api.delete(f"/api/v1/tokens/{token['id']}", headers=demo_auth)
