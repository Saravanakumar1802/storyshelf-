from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core.config import Settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    sha256,
    verify_password,
)


def test_password_hash_roundtrip_and_salting() -> None:
    h1, h2 = hash_password("publish123"), hash_password("publish123")
    assert h1 != h2 and h1.startswith("$argon2id$")
    assert verify_password("publish123", h1)
    assert not verify_password("publish124", h1)


def test_access_token_roundtrip(settings: Settings) -> None:
    token, ttl = create_access_token(settings, "u1", "reader")
    assert ttl == settings.access_token_minutes * 60
    claims = decode_access_token(settings, token)
    assert claims["sub"] == "u1" and claims["role"] == "reader"


def test_tampered_or_foreign_tokens_are_rejected(settings: Settings) -> None:
    token, _ = create_access_token(settings, "u1", "reader")
    other = settings.model_copy(
        update={"jwt_secret": settings.jwt_secret.__class__("another-secret-" + "y" * 32)}
    )
    with pytest.raises(jwt.InvalidSignatureError):
        decode_access_token(other, token)


def test_expired_and_wrong_type_tokens_are_rejected(settings: Settings) -> None:
    secret = settings.jwt_secret.get_secret_value()
    past = datetime.now(UTC) - timedelta(hours=1)
    expired = jwt.encode(
        {
            "sub": "u1",
            "iat": past,
            "exp": past + timedelta(minutes=1),
            "iss": "ai-library-api",
            "type": "access",
        },
        secret,
        algorithm="HS256",
    )
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(settings, expired)
    now = datetime.now(UTC)
    refresh_like = jwt.encode(
        {
            "sub": "u1",
            "iat": now,
            "exp": now + timedelta(minutes=5),
            "iss": "ai-library-api",
            "type": "other",
        },
        secret,
        algorithm="HS256",
    )
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(settings, refresh_like)


def test_sha256_is_stable() -> None:
    assert sha256("abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
