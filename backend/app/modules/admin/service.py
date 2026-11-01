"""
The admin console: library health at a glance, imports, books and accounts.

Hiding a book takes it out of every reader-facing query (they all filter on
status "published") without deleting its chapters or vectors, so it can be
brought back instantly.
"""

from datetime import UTC, datetime, timedelta

from bson import ObjectId
from bson.errors import InvalidId

from app.core.config import Settings
from app.core.errors import AppError, ErrorCode
from app.db.mongo import Database, storage_used_mb
from app.ingest.gutenberg.fetch import FetchError, HtmlSource
from app.ingest.gutenberg.licence import LicenceError, check_licence
from app.ingest.gutenberg.parse import parse_book
from app.ingest.gutenberg.pipeline import MIN_WORDS, estimate_mb
from app.modules.admin.schemas import AdminBook, AdminUser, ContactMessage, ImportPreview, Stats
from app.modules.books.repository import PUBLISHED

MAX_ROWS = 500
_HIDDEN = "hidden"


def _oid(value: str, what: str) -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId as exc:
        raise AppError(ErrorCode.NOT_FOUND, f"We couldn't find that {what}.") from exc


class AdminService:
    def __init__(self, db: Database, settings: Settings) -> None:
        self.db = db
        self.settings = settings

    async def stats(self) -> Stats:
        roles = {
            r["_id"]: r["n"]
            async for r in await self.db["users"].aggregate([{"$group": {"_id": "$role", "n": {"$sum": 1}}}])
        }
        since = datetime.now(UTC) - timedelta(hours=24)
        calls = self.db["ai_calls"]
        return Stats(
            books=await self.db["books"].count_documents({"status": PUBLISHED}),
            hidden_books=await self.db["books"].count_documents({"status": _HIDDEN}),
            passages=await self.db["chunks"].estimated_document_count(),
            readers=roles.get("reader", 0),
            authors=roles.get("author", 0),
            admins=roles.get("admin", 0),
            storage_mb=await storage_used_mb(self.db),
            storage_budget_mb=self.settings.storage_budget_mb,
            ai_calls=await calls.count_documents({"at": {"$gte": since}, "cached": False}),
            ai_failures=await calls.count_documents({"at": {"$gte": since}, "ok": False}),
            tickets_open=await self.db["tickets"].count_documents({"status": {"$ne": "resolved"}}),
            publish_requests=await self.db["publish_requests"].estimated_document_count(),
        )

    async def preview(
        self, source: HtmlSource, gutenberg_id: int, *, min_words: int = MIN_WORDS
    ) -> ImportPreview:
        in_library = await self.db["books"].find_one({"gutenberg_id": gutenberg_id}, {"_id": 1}) is not None
        try:
            book = parse_book(await source.fetch_html(gutenberg_id))
        except FetchError as exc:
            raise AppError(ErrorCode.NOT_FOUND, str(exc)) from exc
        allowed, reason = True, "Public domain in the USA and India. Ready to import."
        try:
            check_licence(book.rights, book.people)
        except LicenceError as exc:
            allowed, reason = False, f"Licence: {exc}"
        est = estimate_mb(book)
        used = await storage_used_mb(self.db)
        if allowed and book.words < min_words:
            allowed, reason = False, f"Too little text to read ({book.words} words)"
        elif allowed and used + est > self.settings.storage_budget_mb:
            allowed = False
            reason = (
                f"Storage budget: {used:.1f} MB used + {est:.1f} MB > {self.settings.storage_budget_mb} MB"
            )
        if in_library:
            allowed, reason = False, "Already in the library."
        return ImportPreview(
            gutenberg_id=gutenberg_id,
            title=book.title,
            author=" & ".join(p.name for p in book.authors) or "Anonymous",
            language=book.language,
            words=book.words,
            chapters=len(book.chapters),
            estimated_mb=est,
            allowed=allowed,
            reason=reason,
            in_library=in_library,
        )

    async def books(self) -> list[AdminBook]:
        docs = (
            await self.db["books"]
            .find(
                {"status": {"$in": [PUBLISHED, _HIDDEN]}},
                {
                    "slug": 1,
                    "title": 1,
                    "author": 1,
                    "genre": 1,
                    "status": 1,
                    "words": 1,
                    "passage_count": 1,
                    "ai": 1,
                    "gutenberg_id": 1,
                    "added_at": 1,
                },
            )
            .sort("added_at", -1)
            .to_list(MAX_ROWS)
        )
        return [
            AdminBook(
                id=str(d["_id"]),
                slug=d["slug"],
                title=d["title"],
                author=d["author"],
                genre=d["genre"],
                status=d["status"],
                words=d["words"],
                passages=d.get("passage_count", 0),
                has_ai=bool(d.get("ai")),
                gutenberg_id=d["gutenberg_id"],
                added_at=d["added_at"],
            )
            for d in docs
        ]

    async def set_book_status(self, book_id: str, status: str) -> None:
        result = await self.db["books"].update_one(
            {"_id": _oid(book_id, "book"), "status": {"$in": [PUBLISHED, _HIDDEN]}},
            {"$set": {"status": status}},
        )
        if result.matched_count == 0:
            raise AppError(ErrorCode.NOT_FOUND, "We couldn't find that book.")

    async def users(self) -> list[AdminUser]:
        docs = await self.db["users"].find({}, {"password_hash": 0}).sort("joined_at", -1).to_list(MAX_ROWS)
        return [
            AdminUser(
                id=str(d["_id"]), name=d["name"], email=d["email"], role=d["role"], joined_at=d["joined_at"]
            )
            for d in docs
        ]

    async def set_role(self, admin_id: str, user_id: str, role: str) -> None:
        if user_id == admin_id:
            raise AppError(ErrorCode.CONFLICT, "You can't change your own role. Ask another admin.")
        result = await self.db["users"].update_one(
            {"_id": _oid(user_id, "account")}, {"$set": {"role": role}}
        )
        if result.matched_count == 0:
            raise AppError(ErrorCode.NOT_FOUND, "We couldn't find that account.")

    async def messages(self) -> list[ContactMessage]:
        docs = await self.db["contact_messages"].find().sort("at", -1).to_list(MAX_ROWS)
        return [
            ContactMessage(
                id=d["_id"], **{k: d.get(k) for k in ("name", "email", "phone", "topic", "message", "at")}
            )
            for d in docs
        ]
