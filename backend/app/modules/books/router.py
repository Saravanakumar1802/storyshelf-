from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from app.core.deps import DbDep
from app.modules.books.schemas import BookDetail, BookPage, ChapterOut, GenreCount, SortKey
from app.modules.books.service import BooksService

router = APIRouter(prefix="/books", tags=["books"])


def get_service(db: DbDep) -> BooksService:
    return BooksService(db)


Service = Annotated[BooksService, Depends(get_service)]


@router.get("", response_model=BookPage, summary="Browse and keyword-search the library")
async def list_books(
    service: Service,
    q: Annotated[str, Query(max_length=120)] = "",
    genre: Annotated[str, Query(max_length=40)] = "",
    sort: SortKey = "featured",
    page: Annotated[int, Query(ge=1, le=500)] = 1,
    limit: Annotated[int, Query(ge=1, le=48)] = 24,
) -> BookPage:
    return await service.search(q=q.strip(), genre=genre, sort=sort, page=page, limit=limit)


@router.get("/genres", response_model=list[GenreCount])
async def genres(service: Service) -> list[GenreCount]:
    return await service.genres()


@router.get("/{slug}", response_model=BookDetail)
async def book_detail(slug: Annotated[str, Path(max_length=120)], service: Service) -> BookDetail:
    return await service.detail(slug)


@router.get("/{slug}/chapters/{index}", response_model=ChapterOut, summary="One chapter for the reader")
async def chapter(
    slug: Annotated[str, Path(max_length=120)],
    index: Annotated[int, Path(ge=0, le=2000)],
    service: Service,
) -> ChapterOut:
    return await service.chapter(slug, index)
