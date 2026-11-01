from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.auth import CurrentUser
from app.core.deps import DbDep, SettingsDep
from app.core.rate_limit import limit
from app.modules.auth.schemas import LoginIn, RefreshIn, Session, SignupIn
from app.modules.auth.service import AuthService
from app.modules.users.schemas import UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])


def get_service(db: DbDep, settings: SettingsDep) -> AuthService:
    return AuthService(db, settings)


Service = Annotated[AuthService, Depends(get_service)]


@router.post(
    "/signup",
    dependencies=[limit("auth", 10, 60)],
    response_model=Session,
    status_code=status.HTTP_201_CREATED,
)
async def signup(body: SignupIn, service: Service) -> Session:
    return await service.signup(body)


@router.post("/login", dependencies=[limit("auth", 10, 60)], response_model=Session)
async def login(body: LoginIn, service: Service) -> Session:
    return await service.login(body)


@router.post(
    "/refresh",
    dependencies=[limit("auth", 30, 60)],
    response_model=Session,
    summary="Swap a refresh token for a new session",
)
async def refresh(body: RefreshIn, service: Service) -> Session:
    return await service.refresh(body.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(body: RefreshIn, service: Service) -> None:
    await service.logout(body.refresh_token)


@router.get("/me", response_model=UserPublic)
async def me(user: CurrentUser) -> UserPublic:
    return user
