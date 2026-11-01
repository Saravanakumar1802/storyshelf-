from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel, Field

from app.core.errors import AppError, ErrorCode


class _Author(BaseModel):
    email: str = Field(pattern=r".+@.+")


class _Body(BaseModel):
    title: str = Field(min_length=1)
    author: _Author


def _probe_app(app: FastAPI) -> FastAPI:
    @app.post("/probe")
    async def probe(body: _Body) -> dict[str, str]:
        return {"ok": body.title}

    @app.get("/conflict")
    async def conflict() -> None:
        raise AppError(ErrorCode.CONFLICT, "Already registered", {"email": "Already registered"})

    @app.get("/boom")
    async def boom() -> None:
        raise RuntimeError("secret internals")

    return app


async def test_validation_errors_use_dotted_field_paths(app: FastAPI) -> None:
    async with AsyncClient(transport=ASGITransport(app=_probe_app(app)), base_url="http://t") as c:
        res = await c.post("/probe", json={"title": "", "author": {"email": "nope"}})
    assert res.status_code == 422
    err = res.json()["error"]
    assert err["code"] == "VALIDATION"
    assert set(err["fields"]) == {"title", "author.email"}


async def test_app_error_maps_to_status_and_envelope(app: FastAPI) -> None:
    async with AsyncClient(transport=ASGITransport(app=_probe_app(app)), base_url="http://t") as c:
        res = await c.get("/conflict")
    assert res.status_code == 409
    assert res.json() == {
        "error": {
            "code": "CONFLICT",
            "message": "Already registered",
            "fields": {"email": "Already registered"},
        }
    }


async def test_unknown_route_is_not_found_envelope(client: AsyncClient) -> None:
    res = await client.get("/api/v1/nope")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"


async def test_unhandled_errors_do_not_leak_internals(app: FastAPI) -> None:
    transport = ASGITransport(app=_probe_app(app), raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        res = await c.get("/boom")
    assert res.status_code == 500
    assert "secret" not in res.text
    assert res.json()["error"]["code"] == "INTERNAL"
