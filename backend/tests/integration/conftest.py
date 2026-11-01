"""
Integration tests run the real app against a throwaway database on the Atlas
cluster from backend/.env (`<MONGODB_DB>_test`), emptied before and after the run.
"""

from collections.abc import AsyncIterator
from typing import Any

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.ai.indexing import embed_book
from app.ai.llm.client import LlmClient
from app.ai.llm.providers import build_deployments
from app.ai.vector_store import MemoryVectorIndex
from app.core.config import Settings, get_settings
from app.db.indexes import ensure_indexes
from app.db.mongo import Database, mongo
from app.db.seed import seed_accounts
from app.ingest.gutenberg.pipeline import import_book
from app.main import create_app
from tests.integration.ai_fakes import DESERT, LIGHTHOUSE, BagOfWordsEmbedder, ScriptedLlm


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    if not get_settings().mongodb_uri.get_secret_value():
        skip = pytest.mark.skip(reason="MONGODB_URI not set")
        for item in items:
            if "integration" in item.keywords:
                item.add_marker(skip)


@pytest.fixture(scope="session")
def it_settings() -> Settings:
    base = get_settings()
    return base.model_copy(
        update={
            "app_env": "test",
            "mongodb_db": f"{base.mongodb_db}_test",
            "admin_email": "",
            "rate_limits": False,  # the suite signs in far more often than a person would
        }
    )


async def _reset(db: Database) -> None:
    # the Atlas app user may not drop databases, but readWrite can drop its collections
    for name in await db.list_collection_names():
        await db.drop_collection(name)


@pytest.fixture(scope="session")
async def it_db(it_settings: Settings) -> AsyncIterator[Database]:
    await mongo.connect(it_settings)
    await _reset(mongo.db)
    await ensure_indexes(mongo.db)
    await seed_accounts(mongo.db, it_settings)
    yield mongo.db
    await _reset(mongo.db)
    await mongo.close()


@pytest.fixture(scope="session")
def it_app(it_settings: Settings, it_db: Database) -> FastAPI:
    # the connection is owned by it_db, so the app must not open its own
    return create_app(it_settings, connect_db=False)


@pytest.fixture
async def api(it_app: FastAPI) -> AsyncIterator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=it_app), base_url="http://it") as c:
        yield c


@pytest.fixture(scope="session")
async def ai_shelf(it_db: Database, it_settings: Settings, it_app: FastAPI) -> AsyncIterator[dict[str, Any]]:
    """Two embedded books (a lighthouse tale, a desert tale) and the app wired to deterministic AI fakes."""

    class Source:
        def __init__(self, html: str) -> None:
            self.html = html

        async def fetch_html(self, gutenberg_id: int) -> str:
            return self.html

    slugs: dict[str, str] = {}
    embedder = BagOfWordsEmbedder()
    for name, gid, html in (("lighthouse", 900010, LIGHTHOUSE), ("desert", 900011, DESERT)):
        result = await import_book(it_db, it_settings, Source(html), gid, min_words=50)
        assert result.status == "imported" and result.slug, result.detail
        slugs[name] = result.slug
        book = await it_db.books.find_one({"gutenberg_id": gid})
        assert book is not None
        await embed_book(it_db, embedder, book)  # type: ignore[arg-type]

    llm_calls = ScriptedLlm()
    deployments = build_deployments(Settings(_env_file=None, gemini_api_key="k", groq_api_key="k"))  # type: ignore[call-arg]
    saved = (it_app.state.embedder, getattr(it_app.state, "vectors", None), it_app.state.llm)
    it_app.state.embedder = embedder
    it_app.state.vectors = await MemoryVectorIndex.from_db(it_db)
    it_app.state.llm = LlmClient(deployments, completion=llm_calls)
    yield {**slugs, "llm_calls": llm_calls}
    it_app.state.embedder, it_app.state.vectors, it_app.state.llm = saved


@pytest.fixture
async def demo_auth(api: AsyncClient) -> dict[str, str]:
    login = await api.post(
        "/api/v1/auth/login", json={"email": "demo@storyshelf.in", "password": "publish123"}
    )
    return {"Authorization": f"Bearer {login.json()['accessToken']}"}


@pytest.fixture
async def admin_auth(api: AsyncClient, it_db: Database) -> dict[str, str]:
    email = "librarian@storyshelf.in"
    if await it_db.users.find_one({"email": email}) is None:
        res = await api.post(
            "/api/v1/auth/signup",
            json={"name": "Lib Rarian", "email": email, "password": "shelves4stacks"},
        )
        assert res.status_code == 201, res.text
        await it_db.users.update_one({"email": email}, {"$set": {"role": "admin"}})
    login = await api.post("/api/v1/auth/login", json={"email": email, "password": "shelves4stacks"})
    return {"Authorization": f"Bearer {login.json()['accessToken']}"}
