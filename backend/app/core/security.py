"""
Passwords and tokens.

- Passwords: Argon2id via pwdlib.
- Access token: short-lived JWT (HS256) carrying the user id and role.
- Refresh token: an opaque random string. Only its SHA-256 is stored, so a
  database leak can't be replayed (see modules/auth/repository.py).
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt
from pwdlib import PasswordHash

from app.core.config import Settings

Role = Literal["reader", "author", "admin"]

_ALGORITHM = "HS256"
_ISSUER = "ai-library-api"
_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _hasher.verify(password, password_hash)


def create_access_token(settings: Settings, user_id: str, role: Role) -> tuple[str, int]:
    """Returns the token and its lifetime in seconds."""
    ttl = timedelta(minutes=settings.access_token_minutes)
    now = datetime.now(UTC)
    claims = {"sub": user_id, "role": role, "iat": now, "exp": now + ttl, "iss": _ISSUER, "type": "access"}
    return jwt.encode(claims, settings.jwt_secret.get_secret_value(), algorithm=_ALGORITHM), int(
        ttl.total_seconds()
    )


def decode_access_token(settings: Settings, token: str) -> dict[str, Any]:
    """Raises jwt.PyJWTError for anything expired, tampered or not an access token."""
    claims: dict[str, Any] = jwt.decode(
        token,
        settings.jwt_secret.get_secret_value(),
        algorithms=[_ALGORITHM],
        issuer=_ISSUER,
        options={"require": ["sub", "exp", "iat", "iss"]},
    )
    if claims.get("type") != "access":
        raise jwt.InvalidTokenError("not an access token")
    return claims


def new_opaque_token() -> str:
    return secrets.token_urlsafe(32)


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()
