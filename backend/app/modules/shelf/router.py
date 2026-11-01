from typing import Annotated

from fastapi import APIRouter, Depends, Path, status

from app.core.auth import CurrentUser
from app.core.deps import DbDep
from app.modules.shelf.schemas import ProgressIn, SetStatusIn, ShelfItem
from app.modules.shelf.service import ShelfService

router = APIRouter(prefix="/library", tags=["my library"])

Slug = Annotated[str, Path(max_length=120)]


def get_service(db: DbDep) -> ShelfService:
    return ShelfService(db)


Service = Annotated[ShelfService, Depends(get_service)]


@router.get("/shelf", response_model=list[ShelfItem], summary="The signed-in reader's shelves")
async def shelf(user: CurrentUser, service: Service) -> list[ShelfItem]:
    return await service.list(user.id)


@router.put("/shelf/{slug}", response_model=ShelfItem, summary="Put a book on a shelf")
async def set_status(slug: Slug, body: SetStatusIn, user: CurrentUser, service: Service) -> ShelfItem:
    return await service.set_status(user.id, slug, body.status)


@router.delete("/shelf/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def remove(slug: Slug, user: CurrentUser, service: Service) -> None:
    await service.remove(user.id, slug)


@router.put("/progress/{slug}", response_model=ShelfItem, summary="Save the reader's place")
async def progress(slug: Slug, body: ProgressIn, user: CurrentUser, service: Service) -> ShelfItem:
    return await service.record_progress(user.id, slug, body.chapter)
