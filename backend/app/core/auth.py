"""Who is calling: `CurrentUser` for signed-in routes, `require_roles(...)` for role-gated ones."""

from collections.abc import Awaitable, Callable
from typing import Annotated

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.deps import DbDep, SettingsDep
from app.core.errors import AppError, ErrorCode
from app.core.security import Role, decode_access_token
from app.modules.users.repository import UsersRepository, to_public
from app.modules.users.schemas import UserPublic

_bearer = HTTPBearer(auto_error=False)
BearerDep = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]


async def get_optional_user(creds: BearerDep, db: DbDep, settings: SettingsDep) -> UserPublic | None:
    if creds is None:
        return None
    try:
        claims = decode_access_token(settings, creds.credentials)
    except jwt.PyJWTError as exc:
        raise AppError(ErrorCode.UNAUTHORIZED, "Your session has expired. Please sign in again.") from exc
    doc = await UsersRepository(db).get_by_id(claims["sub"])
    if doc is None:
        raise AppError(ErrorCode.UNAUTHORIZED, "This account no longer exists.")
    return to_public(doc)


async def get_current_user(user: Annotated[UserPublic | None, Depends(get_optional_user)]) -> UserPublic:
    if user is None:
        raise AppError(ErrorCode.UNAUTHORIZED, "Please sign in to continue.")
    return user


OptionalUser = Annotated[UserPublic | None, Depends(get_optional_user)]
CurrentUser = Annotated[UserPublic, Depends(get_current_user)]


def require_roles(*roles: Role) -> Callable[[UserPublic], Awaitable[UserPublic]]:
    async def check(user: CurrentUser) -> UserPublic:
        if user.role not in roles:
            raise AppError(ErrorCode.FORBIDDEN, "You don't have access to this.")
        return user

    return check


AdminUser = Annotated[UserPublic, Depends(require_roles("admin"))]
