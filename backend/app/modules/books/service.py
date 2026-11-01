from app.core.errors import AppError, ErrorCode
from app.db.mongo import Database, Document
from app.modules.books.repository import NOT_FEATURED, BooksRepository
from app.modules.books.schemas import (
    BookDetail,
    BookPage,
    BookSummary,
    ChapterBook,
    ChapterOut,
    GenreCount,
    SortKey,
    TocEntry,
)

_NOT_FOUND = AppError(ErrorCode.NOT_FOUND, "We couldn't find that book in the library.")
_LANGUAGES = {
    "en": "English",
    "fr": "French",
    "de": "German",
    "es": "Spanish",
    "it": "Italian",
    "la": "Latin",
}


def to_summary(doc: Document) -> BookSummary:
    return BookSummary(
        id=str(doc["_id"]),
        slug=doc["slug"],
        title=doc["title"],
        subtitle=doc.get("subtitle"),
        author=doc["author"],
        author_years=doc.get("author_years"),
        genre=doc["genre"],
        language=_LANGUAGES.get(doc["language"], doc["language"]),
        cover=doc["cover"],
        words=doc["words"],
        reading_minutes=doc["reading_minutes"],
        chapter_count=doc["chapter_count"],
        opening=doc["opening"],
        featured=doc.get("featured_rank", NOT_FEATURED) < NOT_FEATURED,
        ai=doc.get("ai"),
    )


class BooksService:
    def __init__(self, db: Database) -> None:
        self.repo = BooksRepository(db)

    async def search(self, *, q: str, genre: str, sort: SortKey, page: int, limit: int) -> BookPage:
        docs, total, pages = await self.repo.search(q=q, genre=genre, sort=sort, page=page, limit=limit)
        return BookPage(items=[to_summary(d) for d in docs], total=total, page=page, pages=pages)

    async def genres(self) -> list[GenreCount]:
        return [GenreCount(genre=g["_id"], count=g["count"]) for g in await self.repo.genre_counts()]

    async def detail(self, slug: str) -> BookDetail:
        doc = await self.repo.get_by_slug(slug)
        if doc is None:
            raise _NOT_FOUND
        toc = [TocEntry(**c) for c in await self.repo.toc(doc["_id"])]
        return BookDetail(
            **to_summary(doc).model_dump(),
            contributors=doc.get("contributors", []),
            subjects=doc.get("subjects", []),
            source=doc["source"],
            toc=toc,
        )

    async def chapter(self, slug: str, index: int) -> ChapterOut:
        book = await self.repo.get_by_slug(slug)
        if book is None:
            raise _NOT_FOUND
        ch = await self.repo.chapter(book["_id"], index)
        if ch is None:
            raise AppError(ErrorCode.NOT_FOUND, f"This book has no chapter {index + 1}.")
        total = book["chapter_count"]
        return ChapterOut(
            book=ChapterBook(slug=book["slug"], title=book["title"], author=book["author"]),
            index=index,
            title=ch["title"],
            paragraphs=ch["paragraphs"],
            words=ch["words"],
            total=total,
            prev=index - 1 if index > 0 else None,
            next=index + 1 if index + 1 < total else None,
            ai=ch.get("ai"),
        )
