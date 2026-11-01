"""
Ask My Library: a conversation with the reader's own books (retrieval-augmented generation).

For each question:
1. Scope: the books on the reader's shelves, or the one book the thread is about.
2. Standalone question: a follow-up like "why did he do that?" is rewritten
   into a self-contained question using the last few turns (fast model,
   cached; skipped when no model is available).
3. Retrieve: the question is embedded locally and the nearest passages are
   found with Atlas vector search, pre-filtered to the scope's books. No quota spent.
4. Ground: the passages are numbered and handed to the smart model with
   strict instructions: answer only from them, cite [n], say so when the
   answer isn't there.
5. Stream: the sources go out first (so the UI can show them at once), then
   the answer token by token, then the AiMeta. Both turns are saved.

If every model is resting, the reader still gets the retrieved passages, the
part that finds where in their books the answer lives.
"""

import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId

from app.ai.embeddings import Embedder
from app.ai.llm.client import LlmClient, StreamDone, StreamToken
from app.ai.prompts import StandaloneQuestionOut, ask_messages, standalone_question_messages
from app.ai.vector_store import VectorIndex
from app.core.errors import AppError, ErrorCode, ai_paused
from app.db.mongo import Database, Document
from app.modules.ask.schemas import Message, QuestionIn, Source, SourceBook, Thread, ThreadDetail, ThreadIn
from app.modules.books.repository import PUBLISHED
from app.modules.search.service import excerpt

log = logging.getLogger(__name__)

PASSAGES = 8
HISTORY_TURNS = 6  # messages (3 questions + 3 answers) of context
TITLE_CHARS = 60
MAX_THREADS = 50
EXCERPT_CHARS = 240
_NOT_FOUND = AppError(ErrorCode.NOT_FOUND, "We couldn't find that conversation.")


@dataclass
class AskRun:
    """Everything checked before the stream opens, so errors can still be plain JSON responses."""

    thread: Document
    question: str
    book_ids: list[ObjectId]
    history: list[tuple[str, str]]
    user_id: str


def _oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId as exc:
        raise _NOT_FOUND from exc


class AskService:
    def __init__(self, db: Database, llm: LlmClient, embedder: Embedder, vectors: VectorIndex) -> None:
        self.db = db
        self.threads = db["chat_threads"]
        self.messages = db["chat_messages"]
        self.llm = llm
        self.embedder = embedder
        self.vectors = vectors

    # ── threads ──

    async def create_thread(self, user_id: str, body: ThreadIn) -> Thread:
        book = None
        if body.scope == "book":
            book = await self.db["books"].find_one(
                {"slug": body.book, "status": PUBLISHED}, {"slug": 1, "title": 1, "author": 1}
            )
            if book is None:
                raise AppError(ErrorCode.NOT_FOUND, "We couldn't find that book in the library.")
        now = datetime.now(UTC)
        doc: dict[str, Any] = {
            "user_id": ObjectId(user_id),
            "title": f"About {book['title']}" if book else "New conversation",
            "scope": body.scope,
            "book": {"slug": book["slug"], "title": book["title"], "author": book["author"]}
            if book
            else None,
            "created_at": now,
            "updated_at": now,
        }
        doc["_id"] = (await self.threads.insert_one(doc)).inserted_id
        return self._thread(doc)

    async def list_threads(self, user_id: str) -> list[Thread]:
        docs = (
            await self.threads.find({"user_id": ObjectId(user_id)})
            .sort("updated_at", -1)
            .to_list(MAX_THREADS)
        )
        return [self._thread(d) for d in docs]

    async def get_thread(self, user_id: str, thread_id: str) -> ThreadDetail:
        thread = await self._owned(user_id, thread_id)
        msgs = await self.messages.find({"thread_id": thread["_id"]}).sort("created_at", 1).to_list()
        return ThreadDetail(**self._thread(thread).model_dump(), messages=[self._message(m) for m in msgs])

    async def delete_thread(self, user_id: str, thread_id: str) -> None:
        thread = await self._owned(user_id, thread_id)
        await self.messages.delete_many({"thread_id": thread["_id"]})
        await self.threads.delete_one({"_id": thread["_id"]})

    async def _owned(self, user_id: str, thread_id: str) -> Document:
        thread = await self.threads.find_one({"_id": _oid(thread_id), "user_id": ObjectId(user_id)})
        if thread is None:
            raise _NOT_FOUND
        return thread

    # ── asking ──

    async def prepare(self, user_id: str, thread_id: str, body: QuestionIn) -> AskRun:
        thread = await self._owned(user_id, thread_id)
        if thread["scope"] == "book":
            book = await self.db["books"].find_one({"slug": thread["book"]["slug"]}, {"_id": 1})
            book_ids = [book["_id"]] if book else []
        else:
            rows = (
                await self.db["shelf_items"].find({"user_id": ObjectId(user_id)}, {"book_id": 1}).to_list(500)
            )
            book_ids = [r["book_id"] for r in rows]
        if not book_ids:
            raise AppError(
                ErrorCode.CONFLICT,
                "Your shelves are empty. Add a book or two to My Library, then ask about them.",
            )
        recent = (
            await self.messages.find({"thread_id": thread["_id"], "error": None})
            .sort("created_at", -1)
            .to_list(HISTORY_TURNS)
        )
        history = [(m["role"], m["content"]) for m in reversed(recent)]
        return AskRun(thread, body.question.strip(), book_ids, history, user_id)

    async def answer(self, run: AskRun) -> AsyncIterator[tuple[str, Any]]:
        """Yields (event, payload): "sources", then "token"s, then "done" or "error"."""
        await self._save(run.thread, "reader", run.question)
        if not run.history:
            await self.threads.update_one(
                {"_id": run.thread["_id"], "title": "New conversation"},
                {
                    "$set": {
                        "title": run.question[:TITLE_CHARS] + ("…" if len(run.question) > TITLE_CHARS else "")
                    }
                },
            )

        query = await self._standalone(run)
        sources, excerpts = await self._retrieve(query, run.book_ids)
        yield "sources", [s.model_dump(mode="json") for s in sources]

        text = ""
        try:
            async for event in self.llm.stream(
                task="ask",
                group="smart",
                messages=ask_messages(run.history, run.question, excerpts),
                user_id=run.user_id,
            ):
                if isinstance(event, StreamToken):
                    text += event.text
                    yield "token", event.text
                elif isinstance(event, StreamDone):
                    saved = await self._save(
                        run.thread, "librarian", text, sources=sources, meta=event.meta.model_dump()
                    )
                    yield "done", {"messageId": str(saved), "meta": event.meta.model_dump(mode="json")}
        except AppError as exc:
            if not ai_paused(exc):
                raise
            await self._save(run.thread, "librarian", text, sources=sources, error=exc.message)
            yield "error", {"code": exc.code.value, "message": exc.message}

    async def _standalone(self, run: AskRun) -> str:
        if not run.history or not self.llm.configured:
            return run.question
        try:
            out, _ = await self.llm.complete_json(
                StandaloneQuestionOut,
                task="ask",
                group="fast",
                messages=standalone_question_messages(run.history, run.question),
                max_tokens=150,
                cache_ttl_s=86_400,
                user_id=run.user_id,
            )
        except AppError as exc:
            if not ai_paused(exc):
                raise
            return run.question
        return out.question

    async def _retrieve(
        self, query: str, book_ids: list[ObjectId]
    ) -> tuple[list[Source], list[tuple[int, str, str]]]:
        vector = await self.embedder.embed_query(query)
        hits = await self.vectors.search_passages(vector, PASSAGES, book_ids=book_ids)
        if not hits:
            return [], []
        books = (
            await self.db["books"]
            .find(
                {"_id": {"$in": list({h.doc["book_id"] for h in hits})}}, {"slug": 1, "title": 1, "author": 1}
            )
            .to_list()
        )
        by_id = {b["_id"]: b for b in books}
        keys = [{"book_id": h.doc["book_id"], "index": h.doc["chapter"]} for h in hits]
        chapters = (
            await self.db["chapters"].find({"$or": keys}, {"book_id": 1, "index": 1, "title": 1}).to_list()
        )
        titles = {(c["book_id"], c["index"]): c["title"] for c in chapters}

        sources, excerpts = [], []
        for n, h in enumerate(hits, 1):
            book = by_id[h.doc["book_id"]]
            chapter_title = titles.get((book["_id"], h.doc["chapter"]), f"Chapter {h.doc['chapter'] + 1}")
            sources.append(
                Source(
                    n=n,
                    book=SourceBook(slug=book["slug"], title=book["title"], author=book["author"]),
                    chapter=h.doc["chapter"],
                    chapter_title=chapter_title,
                    excerpt=excerpt(h.doc["text"], EXCERPT_CHARS),
                )
            )
            excerpts.append((n, f"{book['title']}, {chapter_title}", h.doc["text"]))
        return sources, excerpts

    # ── storage ──

    async def _save(
        self,
        thread: Document,
        role: str,
        content: str,
        *,
        sources: list[Source] | None = None,
        meta: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> ObjectId:
        now = datetime.now(UTC)
        result = await self.messages.insert_one(
            {
                "thread_id": thread["_id"],
                "role": role,
                "content": content,
                "sources": [s.model_dump() for s in sources or []],
                "meta": meta,
                "error": error,
                "created_at": now,
            }
        )
        await self.threads.update_one({"_id": thread["_id"]}, {"$set": {"updated_at": now}})
        return result.inserted_id  # type: ignore[no-any-return]

    @staticmethod
    def _thread(d: Document) -> Thread:
        return Thread(
            id=str(d["_id"]),
            title=d["title"],
            scope=d["scope"],
            book=d.get("book"),
            created_at=d["created_at"],
            updated_at=d["updated_at"],
        )

    @staticmethod
    def _message(m: Document) -> Message:
        return Message(
            id=str(m["_id"]),
            role=m["role"],
            content=m["content"],
            sources=m.get("sources", []),
            meta=m.get("meta"),
            error=m.get("error"),
            created_at=m["created_at"],
        )
