import math
import re
from typing import Any

from bson import ObjectId
from pymongo import ASCENDING, DESCENDING

from app.db.mongo import Database, Document
from app.modules.books.schemas import SortKey

PUBLISHED = "published"
# curated books carry their shelf position (0, 1, 2…); everything else sorts after them
NOT_FEATURED = 10_000

# lists never carry the heavy fields
SUMMARY_FIELDS = {
    "subjects": 0,
    "contributors": 0,
    "source": 0,
    "text_bytes": 0,
    "vector": 0,
    "content_vector": 0,
}
# vectors are for search, never for the client
DETAIL_FIELDS = {"vector": 0, "content_vector": 0}

_SORTS: dict[SortKey, list[tuple[str, int]]] = {
    "featured": [("featured_rank", ASCENDING), ("title", ASCENDING)],
    "title": [("title", ASCENDING)],
    "author": [("author", ASCENDING), ("title", ASCENDING)],
    "shortest": [("words", ASCENDING)],
    "longest": [("words", DESCENDING)],
}


class BooksRepository:
    def __init__(self, db: Database) -> None:
        self.books = db["books"]
        self.chapters = db["chapters"]

    # ── reads ──

    async def search(
        self, *, q: str, genre: str, sort: SortKey, page: int, limit: int
    ) -> tuple[list[Document], int, int]:
        query: dict[str, Any] = {"status": PUBLISHED}
        if genre:
            query["genre"] = genre
        projection: dict[str, Any] = dict(SUMMARY_FIELDS)
        order: list[tuple[str, Any]] = list(_SORTS[sort])
        if q:
            query["$text"] = {"$search": q}
            projection["score"] = {"$meta": "textScore"}
            order = [("score", {"$meta": "textScore"}), *order]
        total = await self.books.count_documents(query)
        cursor = self.books.find(query, projection).sort(order).skip((page - 1) * limit).limit(limit)
        return await cursor.to_list(), total, max(1, math.ceil(total / limit))

    async def get_by_slug(self, slug: str) -> Document | None:
        return await self.books.find_one({"slug": slug, "status": PUBLISHED}, DETAIL_FIELDS)

    async def toc(self, book_id: ObjectId) -> list[Document]:
        cursor = self.chapters.find({"book_id": book_id}, {"index": 1, "title": 1, "words": 1, "_id": 0})
        return await cursor.sort("index", ASCENDING).to_list()

    async def chapter(self, book_id: ObjectId, index: int) -> Document | None:
        return await self.chapters.find_one({"book_id": book_id, "index": index})

    async def genre_counts(self) -> list[Document]:
        pipeline: list[dict[str, Any]] = [
            {"$match": {"status": PUBLISHED}},
            {"$group": {"_id": "$genre", "count": {"$sum": 1}}},
            {"$sort": {"count": -1, "_id": 1}},
        ]
        return await (await self.books.aggregate(pipeline)).to_list()

    # ── ingest ──

    async def exists_gutenberg(self, gutenberg_id: int) -> bool:
        return await self.books.count_documents({"gutenberg_id": gutenberg_id}, limit=1) > 0

    async def free_slug(self, base: str, author: str) -> str:
        candidates = [base, f"{base}-{_slug_part(author)}"]
        for slug in candidates:
            if await self.books.count_documents({"slug": slug}, limit=1) == 0:
                return slug
        return f"{candidates[-1]}-{ObjectId()!s:.6}"

    async def insert_book(self, doc: Document) -> ObjectId:
        result = await self.books.insert_one(doc)
        return result.inserted_id  # type: ignore[no-any-return]

    async def insert_chapters(self, docs: list[Document]) -> None:
        if docs:
            await self.chapters.insert_many(docs, ordered=False)

    async def publish(self, book_id: ObjectId) -> None:
        await self.books.update_one({"_id": book_id}, {"$set": {"status": PUBLISHED}})

    async def delete_book(self, book_id: ObjectId) -> None:
        await self.chapters.delete_many({"book_id": book_id})
        await self.books.delete_one({"_id": book_id})


def _slug_part(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:30]
