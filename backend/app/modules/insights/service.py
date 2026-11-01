"""
AI insights: what a book is about, and what happened in a chapter.

Both are generated once and stored on the book or chapter document, so every
later reader gets them instantly and for free. The AiMeta (which model, how
long, any fallbacks) is stored with them and shown beside the text.
"""

from datetime import UTC, datetime

from app.ai.embeddings import Embedder
from app.ai.indexing import refresh_book_vector
from app.ai.llm.client import LlmClient
from app.ai.prompts import (
    BOOK_PROMPT_VERSION,
    CHAPTER_PROMPT_VERSION,
    BookInsightsOut,
    ChapterSummaryOut,
    book_insights_messages,
    chapter_summary_messages,
)
from app.core.errors import AppError, ErrorCode
from app.db.mongo import Database, Document
from app.modules.books.repository import PUBLISHED
from app.modules.insights.schemas import BookAi, ChapterAi

# what the model reads about a book: its opening and a slice of the middle, never the ending
OPENING_CHARS = 9_000
MIDDLE_CHARS = 4_000
# a chapter longer than this is summarised from its first part (noted in the prompt)
CHAPTER_CHARS = 24_000
CACHE_TTL_S = 30 * 86_400


def _take(paragraphs: list[str], limit: int) -> str:
    out, size = [], 0
    for p in paragraphs:
        if size + len(p) > limit:
            break
        out.append(p)
        size += len(p) + 1
    return "\n".join(out) or (paragraphs[0][:limit] if paragraphs else "")


async def book_sample(db: Database, book: Document) -> str:
    chapters = (
        await db["chapters"]
        .find({"book_id": book["_id"]}, {"index": 1, "paragraphs": 1})
        .sort("index", 1)
        .to_list()
    )
    if not chapters:
        return ""
    opening = _take([p for ch in chapters[:3] for p in ch["paragraphs"]], OPENING_CHARS)
    middle = chapters[len(chapters) // 2]
    if len(chapters) < 4:
        return opening
    return f"{opening}\n\n[…]\n\n{_take(middle['paragraphs'], MIDDLE_CHARS)}"


async def enrich_book(db: Database, llm: LlmClient, embedder: Embedder | None, book: Document) -> BookAi:
    """Writes the book's AI insights, then re-blends its vector so search and similarity use them."""
    sample = await book_sample(db, book)
    out, meta = await llm.complete_json(
        BookInsightsOut,
        task="summary",
        group="long",
        messages=book_insights_messages(book, sample),
        max_tokens=900,
        cache_ttl_s=CACHE_TTL_S,
    )
    ai = BookAi(**out.model_dump(), meta=meta)
    stored = {**ai.model_dump(), "prompt_version": BOOK_PROMPT_VERSION, "generated_at": datetime.now(UTC)}
    await db["books"].update_one({"_id": book["_id"]}, {"$set": {"ai": stored}})
    if embedder is not None and book.get("content_vector") is not None:
        await refresh_book_vector(db, embedder, {**book, "ai": stored})
    return ai


async def chapter_summary(
    db: Database, llm: LlmClient, slug: str, index: int, user_id: str | None
) -> ChapterAi:
    book = await db["books"].find_one({"slug": slug, "status": PUBLISHED}, {"title": 1, "author": 1})
    if book is None:
        raise AppError(ErrorCode.NOT_FOUND, "We couldn't find that book in the library.")
    chapter = await db["chapters"].find_one({"book_id": book["_id"], "index": index})
    if chapter is None:
        raise AppError(ErrorCode.NOT_FOUND, f"This book has no chapter {index + 1}.")
    if chapter.get("ai"):  # summarised before: free and instant
        return ChapterAi(**chapter["ai"])

    text = "\n".join(chapter["paragraphs"])
    truncated = len(text) > CHAPTER_CHARS
    out, meta = await llm.complete_json(
        ChapterSummaryOut,
        task="chapter_summary",
        group="long",
        messages=chapter_summary_messages(book, chapter["title"], text[:CHAPTER_CHARS], truncated),
        max_tokens=700,
        cache_ttl_s=CACHE_TTL_S,
        user_id=user_id,
    )
    ai = ChapterAi(**out.model_dump(), meta=meta)
    stored = {**ai.model_dump(), "prompt_version": CHAPTER_PROMPT_VERSION, "generated_at": datetime.now(UTC)}
    await db["chapters"].update_one({"_id": chapter["_id"]}, {"$set": {"ai": stored}})
    return ai
