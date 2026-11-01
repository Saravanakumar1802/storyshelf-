"""The admin console: role gating, imports as background jobs, hiding books, managing roles."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import pytest
from fastapi import FastAPI
from httpx import AsyncClient

from app.db.mongo import Database
from app.modules.admin.jobs import ImportQueue
from tests.integration.ai_fakes import FIXTURE

pytestmark = pytest.mark.integration

ORCHARD = FIXTURE.replace("The Lantern Keeper: A Tale of the Coast", "The Glass Orchard")
NOT_FREE = FIXTURE.replace("Public domain in the USA.", "Copyrighted. Read the copyright notice.")
BOOKS = {900020: ORCHARD, 900021: NOT_FREE}


class FixtureSource:
    async def fetch_html(self, gutenberg_id: int) -> str:
        return BOOKS[gutenberg_id]


@asynccontextmanager
async def fixture_source() -> AsyncIterator[FixtureSource]:
    yield FixtureSource()


@pytest.fixture
def imports(it_app: FastAPI, it_db: Database, it_settings: Any, ai_shelf: dict[str, Any]) -> ImportQueue:
    # the fixture is a short story, so the minimum length is lowered
    queue = ImportQueue(
        it_db, it_settings, it_app.state.llm, it_app.state.embedder, source=fixture_source, min_words=50
    )
    it_app.state.imports = queue
    return queue


async def test_the_console_is_for_admins_only(api: AsyncClient, demo_auth: dict[str, str]) -> None:
    assert (await api.get("/api/v1/admin/stats")).status_code == 401
    assert (await api.get("/api/v1/admin/stats", headers=demo_auth)).status_code == 403


async def test_stats_describe_the_library(
    api: AsyncClient, admin_auth: dict[str, str], ai_shelf: dict[str, Any]
) -> None:
    stats = (await api.get("/api/v1/admin/stats", headers=admin_auth)).json()
    assert stats["books"] >= 2 and stats["passages"] > 0 and stats["admins"] >= 1
    assert stats["storageBudgetMb"] > stats["storageMb"] > 0


async def test_preview_checks_the_licence_without_storing(
    api: AsyncClient, admin_auth: dict[str, str], imports: ImportQueue, it_db: Database
) -> None:
    ok = (await api.get("/api/v1/admin/imports/preview/900020", headers=admin_auth)).json()
    assert ok["title"] == "The Glass Orchard" and ok["allowed"] is True and ok["inLibrary"] is False
    refused = (await api.get("/api/v1/admin/imports/preview/900021", headers=admin_auth)).json()
    assert refused["allowed"] is False and refused["reason"].startswith("Licence")
    assert await it_db.books.count_documents({"gutenberg_id": {"$in": [900020, 900021]}}) == 0


async def test_an_import_runs_as_a_job_and_refuses_unfree_books(
    api: AsyncClient, admin_auth: dict[str, str], imports: ImportQueue
) -> None:
    started = await api.post("/api/v1/admin/imports", json={"gutenbergId": 900020}, headers=admin_auth)
    assert started.status_code == 202 and started.json()["status"] == "queued"
    dup = await api.post("/api/v1/admin/imports", json={"gutenbergId": 900020}, headers=admin_auth)
    assert dup.status_code == 409

    refused = await api.post("/api/v1/admin/imports", json={"gutenbergId": 900021}, headers=admin_auth)
    await imports.wait_idle()

    job = (await api.get(f"/api/v1/admin/imports/{started.json()['id']}", headers=admin_auth)).json()
    assert job["status"] == "done", job
    assert job["slug"] and "passages indexed" in job["detail"]
    assert (await api.get(f"/api/v1/books/{job['slug']}")).status_code == 200

    bad = (await api.get(f"/api/v1/admin/imports/{refused.json()['id']}", headers=admin_auth)).json()
    assert bad["status"] == "failed" and bad["detail"].startswith("Licence")

    again = await api.post("/api/v1/admin/imports", json={"gutenbergId": 900020}, headers=admin_auth)
    assert again.status_code == 409 and "already in the library" in again.json()["error"]["message"]
    recent = (await api.get("/api/v1/admin/imports", headers=admin_auth)).json()
    assert {j["gutenbergId"] for j in recent} >= {900020, 900021}

    # hiding a book takes it out of the library without deleting it
    book = next(
        b
        for b in (await api.get("/api/v1/admin/books", headers=admin_auth)).json()
        if b["slug"] == job["slug"]
    )
    assert book["passages"] > 0
    hide = await api.put(
        f"/api/v1/admin/books/{book['id']}/status", json={"status": "hidden"}, headers=admin_auth
    )
    assert hide.status_code == 204
    assert (await api.get(f"/api/v1/books/{job['slug']}")).status_code == 404
    await api.put(
        f"/api/v1/admin/books/{book['id']}/status", json={"status": "published"}, headers=admin_auth
    )
    assert (await api.get(f"/api/v1/books/{job['slug']}")).status_code == 200


async def test_admins_manage_roles_but_not_their_own(
    api: AsyncClient, admin_auth: dict[str, str], it_db: Database
) -> None:
    users = (await api.get("/api/v1/admin/users", headers=admin_auth)).json()
    assert all("passwordHash" not in u for u in users)
    me = next(u for u in users if u["email"] == "librarian@storyshelf.in")
    demo = next(u for u in users if u["email"] == "demo@storyshelf.in")

    own = await api.put(f"/api/v1/admin/users/{me['id']}/role", json={"role": "reader"}, headers=admin_auth)
    assert own.status_code == 409
    res = await api.put(f"/api/v1/admin/users/{demo['id']}/role", json={"role": "reader"}, headers=admin_auth)
    assert res.status_code == 204
    assert (await it_db.users.find_one({"email": "demo@storyshelf.in"}) or {})["role"] == "reader"
    await api.put(f"/api/v1/admin/users/{demo['id']}/role", json={"role": "author"}, headers=admin_auth)
