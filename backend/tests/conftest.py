from collections.abc import AsyncIterator
from typing import Any

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.core.deps import get_db
from app.main import create_app


class FakeDb:
    """Just enough of AsyncDatabase for unit tests that never touch Atlas."""

    def __init__(self, stats: dict[str, Any] | None = None, fail: Exception | None = None) -> None:
        self.stats = stats or {"dataSize": 3 * 1024 * 1024, "indexSize": 1024 * 1024}
        self.fail = fail

    async def command(self, name: str) -> dict[str, Any]:
        if self.fail:
            raise self.fail
        assert name == "dbStats"
        return self.stats


@pytest.fixture
def settings() -> Settings:
    return Settings(
        _env_file=None, app_env="test", jwt_secret="test-secret-" + "x" * 32, storage_budget_mb=200
    )  # type: ignore[call-arg]


@pytest.fixture
def fake_db() -> FakeDb:
    return FakeDb()


@pytest.fixture
def app(settings: Settings, fake_db: FakeDb) -> FastAPI:
    application = create_app(settings, connect_db=False)
    application.dependency_overrides[get_db] = lambda: fake_db
    return application


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
