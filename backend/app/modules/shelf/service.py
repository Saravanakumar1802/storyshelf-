"""
My Library: each reader's shelves (want to read, reading, finished) and reading position.

One document per (reader, book). Opening a chapter updates the position; it
moves a book to "reading", and reaching the last chapter marks it "finished".
The shelves are also the reader's taste, which recommendations and Ask My
Library build on.
"""

from datetime import UTC, datetime

from bson import ObjectId
from pymongo import ReturnDocument

from app.core.errors import AppError, ErrorCode
from app.db.mongo import Database, Document
from app.modules.books.repository import PUBLISHED, SUMMARY_FIELDS
from app.modules.books.service import to_summary
from app.modules.shelf.schemas import ShelfItem, ShelfStatus

_NO_BOOK = AppError(ErrorCode.NOT_FOUND, "We couldn't find that book in the library.")
MAX_SHELF = 500


class ShelfService:
    def __init__(self, db: Database) -> None:
        self.items = db["shelf_items"]
        self.books = db["books"]

    async def _book(self, slug: str) -> Document:
        book = await self.books.find_one({"slug": slug, "status": PUBLISHED}, {"_id": 1, "chapter_count": 1})
        if book is None:
            raise _NO_BOOK
        return book

    async def list(self, user_id: str) -> list[ShelfItem]:
        rows = await self.items.find({"user_id": ObjectId(user_id)}).sort("updated_at", -1).to_list(MAX_SHELF)
        books = await self.books.find(
            {"_id": {"$in": [r["book_id"] for r in rows]}}, SUMMARY_FIELDS
        ).to_list()
        by_id = {b["_id"]: b for b in books}
        return [self._item(r, by_id[r["book_id"]]) for r in rows if r["book_id"] in by_id]

    async def set_status(self, user_id: str, slug: str, status: ShelfStatus) -> ShelfItem:
        book = await self._book(slug)
        now = datetime.now(UTC)
        update: dict[str, object] = {"status": status, "updated_at": now}
        if status == "finished":
            update["chapter"] = book["chapter_count"] - 1
        row = await self.items.find_one_and_update(
            {"user_id": ObjectId(user_id), "book_id": book["_id"]},
            {
                "$set": update,
                "$setOnInsert": {"added_at": now, **({} if status == "finished" else {"chapter": 0})},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return await self._one(row)

    async def record_progress(self, user_id: str, slug: str, chapter: int) -> ShelfItem:
        book = await self._book(slug)
        last = book["chapter_count"] - 1
        chapter = min(chapter, last)
        now = datetime.now(UTC)
        key = {"user_id": ObjectId(user_id), "book_id": book["_id"]}
        current = await self.items.find_one(key, {"status": 1})
        # reading moves a book onto "reading" and the last chapter finishes it;
        # re-reading a finished book keeps it finished
        status = "finished" if chapter == last or (current or {}).get("status") == "finished" else "reading"
        row = await self.items.find_one_and_update(
            key,
            {
                "$set": {"chapter": chapter, "status": status, "updated_at": now},
                "$setOnInsert": {"added_at": now},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return await self._one(row)

    async def remove(self, user_id: str, slug: str) -> None:
        book = await self._book(slug)
        await self.items.delete_one({"user_id": ObjectId(user_id), "book_id": book["_id"]})

    async def _one(self, row: Document | None) -> ShelfItem:
        assert row is not None  # an upsert with ReturnDocument.AFTER always returns the document
        book = await self.books.find_one({"_id": row["book_id"]}, SUMMARY_FIELDS)
        assert book is not None
        return self._item(row, book)

    @staticmethod
    def _item(row: Document, book: Document) -> ShelfItem:
        chapters = max(1, book["chapter_count"])
        progress = 1.0 if row["status"] == "finished" else round(row.get("chapter", 0) / chapters, 3)
        return ShelfItem(
            book=to_summary(book),
            status=row["status"],
            chapter=row.get("chapter", 0),
            progress=progress,
            added_at=row["added_at"],
            updated_at=row["updated_at"],
        )
