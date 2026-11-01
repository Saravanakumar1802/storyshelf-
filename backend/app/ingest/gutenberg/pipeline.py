"""
Import one Project Gutenberg book into the library:

    fetch HTML -> parse -> licence check -> storage budget check -> store book + chapters

Semantic chunks, embeddings and the AI summary are added by later steps
(see app/ai), so a book becomes readable as soon as it is stored.
"""

import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal

from app.core.config import Settings
from app.db.mongo import Database, storage_used_mb
from app.ingest.gutenberg.classify import classify_genre, cover_for, reading_minutes, slugify
from app.ingest.gutenberg.fetch import FetchError, HtmlSource
from app.ingest.gutenberg.licence import LicenceError, check_licence
from app.ingest.gutenberg.parse import ParsedBook, parse_book
from app.modules.books.repository import NOT_FEATURED, BooksRepository

log = logging.getLogger(__name__)

# Stored size per byte of book text: chapters (x1) + RAG chunks with overlap (~x1.15)
# + 384-d float32 vectors (~x1.3) + index overhead. Measured on the first imports; deliberately cautious.
FOOTPRINT_FACTOR = 3.4
_MB = 1024 * 1024
# below this it is a pamphlet fragment, not something to read in the library
MIN_WORDS = 2_000


@dataclass(frozen=True)
class ImportResult:
    gutenberg_id: int
    status: Literal["imported", "skipped", "rejected", "failed"]
    detail: str
    slug: str | None = None
    title: str | None = None
    estimated_mb: float | None = None


def estimate_mb(book: ParsedBook) -> float:
    return round(book.text_bytes * FOOTPRINT_FACTOR / _MB, 2)


async def import_book(
    db: Database,
    settings: Settings,
    source: HtmlSource,
    gutenberg_id: int,
    *,
    featured_rank: int | None = None,
    min_words: int = MIN_WORDS,
) -> ImportResult:
    repo = BooksRepository(db)
    if await repo.exists_gutenberg(gutenberg_id):
        return ImportResult(gutenberg_id, "skipped", "Already in the library")

    try:
        book = parse_book(await source.fetch_html(gutenberg_id))
        check_licence(book.rights, book.people)
    except FetchError as exc:
        return ImportResult(gutenberg_id, "failed", str(exc))
    except LicenceError as exc:
        return ImportResult(gutenberg_id, "rejected", f"Licence: {exc}")
    if not book.chapters or book.words < min_words:
        return ImportResult(gutenberg_id, "rejected", f"Too little text to read ({book.words} words)")

    est = estimate_mb(book)
    used = await storage_used_mb(db)
    if used + est > settings.storage_budget_mb:
        return ImportResult(
            gutenberg_id,
            "rejected",
            f"Storage budget: {used:.1f} MB used + {est:.1f} MB > {settings.storage_budget_mb} MB",
            title=book.title,
            estimated_mb=est,
        )

    authors = book.authors
    author = " & ".join(p.name for p in authors)
    slug = await repo.free_slug(slugify(book.title), author)
    genre = classify_genre(book.subjects)
    now = datetime.now(UTC)
    book_id = await repo.insert_book(
        {
            "slug": slug,
            "gutenberg_id": gutenberg_id,
            "status": "importing",  # invisible until every chapter is stored
            "title": book.title,
            "subtitle": book.subtitle,
            "author": author,
            "author_years": authors[0].years if len(authors) == 1 else None,
            "contributors": [{"name": p.name, "role": p.role, "years": p.years} for p in book.people],
            "language": book.language,
            "subjects": book.subjects,
            "genre": genre,
            "cover": cover_for(slug, genre, book.words),
            "words": book.words,
            "reading_minutes": reading_minutes(book.words),
            "chapter_count": len(book.chapters),
            "opening": book.opening,
            "featured_rank": NOT_FEATURED if featured_rank is None else featured_rank,
            "source": {
                "name": "Project Gutenberg",
                "url": f"https://www.gutenberg.org/ebooks/{gutenberg_id}",
            },
            "text_bytes": book.text_bytes,
            "ai": None,
            "added_at": now,
        }
    )
    try:
        await repo.insert_chapters(
            [
                {
                    "book_id": book_id,
                    "index": i,
                    "title": c.title,
                    "paragraphs": c.paragraphs,
                    "words": c.words,
                }
                for i, c in enumerate(book.chapters)
            ]
        )
        await repo.publish(book_id)
    except Exception:
        await repo.delete_book(book_id)
        raise
    log.info("Imported #%s %s (%s chapters, ~%.1f MB)", gutenberg_id, slug, len(book.chapters), est)
    return ImportResult(
        gutenberg_id, "imported", "Ready to read", slug=slug, title=book.title, estimated_mb=est
    )
