import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


def _email() -> str:
    return f"reader-{uuid.uuid4().hex[:8]}@example.com"


async def _signup(api: AsyncClient, email: str, role: str = "reader") -> dict:  # type: ignore[type-arg]
    res = await api.post(
        "/api/v1/auth/signup",
        json={"name": "Asha Reader", "email": email, "password": "readmore1", "role": role},
    )
    assert res.status_code == 201, res.text
    return res.json()  # type: ignore[no-any-return]


async def test_signup_returns_session_and_me_works(api: AsyncClient) -> None:
    email = _email()
    session = await _signup(api, email.upper())  # emails are case-insensitive
    assert session["user"]["email"] == email
    assert session["user"]["role"] == "reader" and session["user"]["plan"] is None
    assert set(session) == {"accessToken", "refreshToken", "expiresIn", "user"}
    assert "joinedAt" in session["user"]

    me = await api.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {session['accessToken']}"})
    assert me.status_code == 200 and me.json()["email"] == email


async def test_author_signup_starts_on_kickstart(api: AsyncClient) -> None:
    session = await _signup(api, _email(), role="author")
    assert session["user"]["role"] == "author" and session["user"]["plan"] == "kickstart"


async def test_admin_cannot_be_self_assigned(api: AsyncClient) -> None:
    res = await api.post(
        "/api/v1/auth/signup",
        json={"name": "Eve", "email": _email(), "password": "readmore1", "role": "admin"},
    )
    assert res.status_code == 422 and "role" in res.json()["error"]["fields"]


async def test_duplicate_email_is_a_field_conflict(api: AsyncClient) -> None:
    email = _email()
    await _signup(api, email)
    res = await api.post(
        "/api/v1/auth/signup", json={"name": "Asha", "email": email, "password": "readmore1"}
    )
    assert res.status_code == 409
    assert res.json()["error"]["fields"] == {"email": "Already registered"}


async def test_weak_password_and_bad_email_are_field_errors(api: AsyncClient) -> None:
    res = await api.post(
        "/api/v1/auth/signup", json={"name": "A B", "email": "nope", "password": "lettersonly"}
    )
    assert res.status_code == 422
    assert set(res.json()["error"]["fields"]) == {"email", "password"}


async def test_demo_author_can_log_in_and_wrong_password_cannot(api: AsyncClient) -> None:
    ok = await api.post("/api/v1/auth/login", json={"email": "demo@storyshelf.in", "password": "publish123"})
    assert ok.status_code == 200 and ok.json()["user"]["role"] == "author"
    bad = await api.post("/api/v1/auth/login", json={"email": "demo@storyshelf.in", "password": "nope"})
    assert bad.status_code == 401 and bad.json()["error"]["code"] == "UNAUTHORIZED"
    ghost = await api.post("/api/v1/auth/login", json={"email": _email(), "password": "whatever1"})
    assert ghost.status_code == 401


async def test_refresh_rotates_and_reuse_revokes_the_family(api: AsyncClient) -> None:
    first = await _signup(api, _email())
    r1 = await api.post("/api/v1/auth/refresh", json={"refreshToken": first["refreshToken"]})
    assert r1.status_code == 200
    second = r1.json()
    assert second["refreshToken"] != first["refreshToken"]

    # replaying the retired token is treated as theft: it fails and kills the newer one too
    replay = await api.post("/api/v1/auth/refresh", json={"refreshToken": first["refreshToken"]})
    assert replay.status_code == 401
    after = await api.post("/api/v1/auth/refresh", json={"refreshToken": second["refreshToken"]})
    assert after.status_code == 401


async def test_logout_ends_the_session(api: AsyncClient) -> None:
    session = await _signup(api, _email())
    out = await api.post("/api/v1/auth/logout", json={"refreshToken": session["refreshToken"]})
    assert out.status_code == 204
    res = await api.post("/api/v1/auth/refresh", json={"refreshToken": session["refreshToken"]})
    assert res.status_code == 401


async def test_me_requires_a_valid_bearer(api: AsyncClient) -> None:
    assert (await api.get("/api/v1/auth/me")).status_code == 401
    bad = await api.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert bad.status_code == 401 and bad.json()["error"]["code"] == "UNAUTHORIZED"
