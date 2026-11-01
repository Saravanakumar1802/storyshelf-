from httpx import AsyncClient
from pymongo.errors import ServerSelectionTimeoutError

from tests.conftest import FakeDb


async def test_health_reports_storage_against_budget(client: AsyncClient) -> None:
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "database": "ok", "storage": {"used_mb": 4.0, "budget_mb": 200}}
    assert res.headers["X-Request-ID"]


async def test_health_degrades_when_database_is_unreachable(client: AsyncClient, fake_db: FakeDb) -> None:
    fake_db.fail = ServerSelectionTimeoutError("no servers")
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json() == {"status": "degraded", "database": "unreachable", "storage": None}


async def test_request_id_is_echoed(client: AsyncClient) -> None:
    res = await client.get("/api/v1/health", headers={"X-Request-ID": "abc123"})
    assert res.headers["X-Request-ID"] == "abc123"
