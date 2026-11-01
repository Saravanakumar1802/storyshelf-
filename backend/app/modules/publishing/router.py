from typing import Annotated

from fastapi import APIRouter, Depends, Path, status

from app.core.auth import AdminUser, OptionalUser, require_roles
from app.core.deps import DbDep
from app.core.rate_limit import limit
from app.modules.publishing.schemas import Dashboard, PublishIn, PublishRequest, StageIn
from app.modules.publishing.service import PublishingService
from app.modules.users.schemas import UserPublic

router = APIRouter(tags=["publishing"])

Ref = Annotated[str, Path(pattern=r"^PUB-[A-Z0-9]{8}$")]
Author = Annotated[UserPublic, Depends(require_roles("author", "admin"))]


def get_service(db: DbDep) -> PublishingService:
    return PublishingService(db)


Service = Annotated[PublishingService, Depends(get_service)]


@router.post(
    "/publish/requests",
    dependencies=[limit("forms", 10, 600)],
    response_model=PublishRequest,
    status_code=status.HTTP_201_CREATED,
    summary="Send a publish request and book the first consultation call",
)
async def submit(body: PublishIn, service: Service, user: OptionalUser) -> PublishRequest:
    return await service.submit(body, user)


@router.get("/publish/requests/{ref}", response_model=PublishRequest)
async def get_request(ref: Ref, service: Service) -> PublishRequest:
    return await service.get(ref)


@router.get("/dashboard", response_model=Dashboard, summary="The author's publishing dashboard")
async def dashboard(user: Author, service: Service) -> Dashboard:
    return await service.dashboard(user)


@router.get("/admin/publish-requests", response_model=list[PublishRequest], tags=["admin"])
async def all_requests(_: AdminUser, service: Service) -> list[PublishRequest]:
    return await service.list_all()


@router.put("/admin/publish-requests/{ref}/stage", response_model=PublishRequest, tags=["admin"])
async def set_stage(ref: Ref, body: StageIn, _: AdminUser, service: Service) -> PublishRequest:
    return await service.set_stage(ref, body.stage_index)
