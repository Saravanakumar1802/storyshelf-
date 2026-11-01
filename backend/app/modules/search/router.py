from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from app.core.deps import DbDep, EmbedderDep, VectorsDep
from app.core.errors import AppError, ErrorCode
from app.core.rate_limit import limit
from app.modules.books.schemas import BookSummary
from app.modules.books.service import to_summary
from app.modules.search.schemas import SearchResponse
from app.modules.search.service import SearchService

router = APIRouter(tags=["search"])


def get_service(db: DbDep, embedder: EmbedderDep, vectors: VectorsDep) -> SearchService:
    return SearchService(db, embedder, vectors)


Service = Annotated[SearchService, Depends(get_service)]


@router.get(
    "/search",
    dependencies=[limit("search", 60, 60)],
    response_model=SearchResponse,
    summary="Search books by meaning, passages and keywords",
)
async def search(
    service: Service,
    q: Annotated[str, Query(min_length=2, max_length=200)],
    genre: Annotated[str | None, Query(max_length=40)] = None,
    limit: Annotated[int, Query(ge=1, le=24)] = 12,
) -> SearchResponse:
    return await service.search(q.strip(), genre=genre or None, limit=limit)


@router.get("/books/{slug}/similar", response_model=list[BookSummary], summary="Books closest in meaning")
async def similar(
    slug: Annotated[str, Path(max_length=120)],
    service: Service,
    limit: Annotated[int, Query(ge=1, le=12)] = 8,
) -> list[BookSummary]:
    docs = await service.similar(slug, limit)
    if docs is None:
        raise AppError(ErrorCode.NOT_FOUND, "We couldn't find that book in the library.")
    return [to_summary(d) for d in docs]
