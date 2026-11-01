from typing import Annotated

from fastapi import APIRouter, Depends, Path, Request, status

from app.core.auth import AdminUser
from app.core.deps import DbDep, SettingsDep
from app.modules.admin.jobs import ImportQueue
from app.modules.admin.schemas import (
    AdminBook,
    BookStatusIn,
    ContactMessage,
    ImportIn,
    ImportJob,
    ImportPreview,
    RoleIn,
    Stats,
)
from app.modules.admin.schemas import AdminUser as AdminUserOut
from app.modules.admin.service import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])

ObjectIdPath = Annotated[str, Path(min_length=24, max_length=24)]
GutenbergId = Annotated[int, Path(ge=1, le=999_999)]


def get_service(db: DbDep, settings: SettingsDep) -> AdminService:
    return AdminService(db, settings)


def get_imports(request: Request) -> ImportQueue:
    imports: ImportQueue = request.app.state.imports
    return imports


Service = Annotated[AdminService, Depends(get_service)]
Imports = Annotated[ImportQueue, Depends(get_imports)]


@router.get("/stats", response_model=Stats, summary="Library health at a glance")
async def stats(_: AdminUser, service: Service) -> Stats:
    return await service.stats()


@router.get("/imports/preview/{gutenberg_id}", response_model=ImportPreview, summary="Check a book first")
async def preview(
    gutenberg_id: GutenbergId, _: AdminUser, service: Service, imports: Imports
) -> ImportPreview:
    async with imports.source() as source:
        return await service.preview(source, gutenberg_id, min_words=imports.min_words)


@router.post("/imports", response_model=ImportJob, status_code=status.HTTP_202_ACCEPTED)
async def start_import(body: ImportIn, admin: AdminUser, imports: Imports) -> ImportJob:
    return await imports.start(body.gutenberg_id, admin.id)


@router.get("/imports", response_model=list[ImportJob], summary="Recent imports")
async def imports_list(_: AdminUser, imports: Imports) -> list[ImportJob]:
    return await imports.recent()


@router.get("/imports/{job_id}", response_model=ImportJob)
async def import_job(job_id: ObjectIdPath, _: AdminUser, imports: Imports) -> ImportJob:
    return await imports.get(job_id)


@router.get("/books", response_model=list[AdminBook])
async def books(_: AdminUser, service: Service) -> list[AdminBook]:
    return await service.books()


@router.put("/books/{book_id}/status", status_code=status.HTTP_204_NO_CONTENT, summary="Publish or hide")
async def book_status(book_id: ObjectIdPath, body: BookStatusIn, _: AdminUser, service: Service) -> None:
    await service.set_book_status(book_id, body.status)


@router.get("/users", response_model=list[AdminUserOut])
async def users(_: AdminUser, service: Service) -> list[AdminUserOut]:
    return await service.users()


@router.put("/users/{user_id}/role", status_code=status.HTTP_204_NO_CONTENT)
async def user_role(user_id: ObjectIdPath, body: RoleIn, admin: AdminUser, service: Service) -> None:
    await service.set_role(admin.id, user_id, body.role)


@router.get("/messages", response_model=list[ContactMessage], summary="Messages from the contact form")
async def messages(_: AdminUser, service: Service) -> list[ContactMessage]:
    return await service.messages()
