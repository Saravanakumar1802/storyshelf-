"""
Book imports started from the admin console (or the MCP `import_gutenberg_book` tool).

An import takes a while (polite download, parse, licence check, embedding on
the CPU, AI insights), so it runs as a background job and the console polls
its progress. Jobs run one at a time: embedding is CPU-bound and the mirror
asks for one request at a time anyway. Job state lives in `ingest_jobs`, so
the console sees it from any tab; a job interrupted by a restart is marked
failed on the next start.
"""

import asyncio
import logging
from collections.abc import Callable
from contextlib import AbstractAsyncContextManager
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId

from app.ai.embeddings import Embedder
from app.ai.indexing import embed_book
from app.ai.llm.client import LlmClient
from app.core.config import Settings
from app.core.errors import AppError, ErrorCode
from app.db.mongo import Database, Document
from app.ingest.gutenberg.fetch import GutenbergFetcher, HtmlSource
from app.ingest.gutenberg.pipeline import MIN_WORDS, import_book
from app.modules.admin.schemas import ImportJob, JobStatus
from app.modules.insights.service import enrich_book

log = logging.getLogger(__name__)

SourceFactory = Callable[[], AbstractAsyncContextManager[HtmlSource]]
RECENT_JOBS = 20
_OPEN = {"$nin": ["done", "failed"]}


def to_job(doc: Document) -> ImportJob:
    return ImportJob(
        id=str(doc["_id"]),
        gutenberg_id=doc["gutenberg_id"],
        status=doc["status"],
        detail=doc.get("detail", ""),
        title=doc.get("title"),
        slug=doc.get("slug"),
        created_at=doc["created_at"],
        finished_at=doc.get("finished_at"),
    )


class ImportQueue:
    def __init__(
        self,
        db: Database,
        settings: Settings,
        llm: LlmClient,
        embedder: Embedder,
        source: SourceFactory | None = None,
        min_words: int = MIN_WORDS,
    ) -> None:
        self.db = db
        self.jobs = db["ingest_jobs"]
        self.settings = settings
        self.llm = llm
        self.embedder = embedder
        self.source: SourceFactory = source or (lambda: GutenbergFetcher(settings))
        self.min_words = min_words
        self._lock = asyncio.Lock()
        self._tasks: set[asyncio.Task[None]] = set()  # strong refs, or the loop may drop running jobs

    async def recover(self) -> None:
        """Jobs that were running when the server stopped will never finish: say so."""
        await self.jobs.update_many(
            {"status": _OPEN},
            {
                "$set": {
                    "status": "failed",
                    "detail": "Interrupted by a server restart. Start it again.",
                    "finished_at": datetime.now(UTC),
                }
            },
        )

    async def start(self, gutenberg_id: int, user_id: str) -> ImportJob:
        if await self.db["books"].find_one({"gutenberg_id": gutenberg_id}, {"_id": 1}):
            raise AppError(ErrorCode.CONFLICT, f"Book #{gutenberg_id} is already in the library.")
        if await self.jobs.find_one({"gutenberg_id": gutenberg_id, "status": _OPEN}):
            raise AppError(ErrorCode.CONFLICT, f"Book #{gutenberg_id} is already being imported.")
        doc: dict[str, Any] = {
            "gutenberg_id": gutenberg_id,
            "status": "queued",
            "detail": "Waiting its turn",
            "created_by": ObjectId(user_id),
            "created_at": datetime.now(UTC),
        }
        doc["_id"] = (await self.jobs.insert_one(doc)).inserted_id
        task = asyncio.create_task(self._run(doc["_id"], gutenberg_id))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return to_job(doc)

    async def get(self, job_id: str) -> ImportJob:
        try:
            doc = await self.jobs.find_one({"_id": ObjectId(job_id)})
        except InvalidId:
            doc = None
        if doc is None:
            raise AppError(ErrorCode.NOT_FOUND, "We couldn't find that import.")
        return to_job(doc)

    async def recent(self) -> list[ImportJob]:
        docs = await self.jobs.find().sort("created_at", -1).to_list(RECENT_JOBS)
        return [to_job(d) for d in docs]

    async def wait_idle(self) -> None:
        """For tests and shutdown: let running jobs finish."""
        while self._tasks:
            await asyncio.gather(*list(self._tasks), return_exceptions=True)

    async def _step(self, job_id: ObjectId, status: JobStatus, detail: str, **extra: Any) -> None:
        update: dict[str, Any] = {"status": status, "detail": detail, **extra}
        if status in ("done", "failed"):
            update["finished_at"] = datetime.now(UTC)
        await self.jobs.update_one({"_id": job_id}, {"$set": update})

    async def _run(self, job_id: ObjectId, gutenberg_id: int) -> None:
        async with self._lock:
            try:
                await self._import(job_id, gutenberg_id)
            except Exception:
                log.exception("Import of #%s failed", gutenberg_id)
                await self._step(
                    job_id, "failed", "Something went wrong during the import. See the API logs."
                )

    async def _import(self, job_id: ObjectId, gutenberg_id: int) -> None:
        await self._step(job_id, "importing", "Downloading, checking the licence and splitting chapters")
        async with self.source() as source:
            result = await import_book(self.db, self.settings, source, gutenberg_id, min_words=self.min_words)
        if result.status != "imported":
            await self._step(job_id, "failed", result.detail, title=result.title)
            return
        book = await self.db["books"].find_one({"slug": result.slug})
        assert book is not None
        named = {"title": result.title, "slug": result.slug}

        await self._step(job_id, "embedding", "Indexing passages for search and Ask My Library", **named)
        passages = await embed_book(self.db, self.embedder, book)
        note = f"Ready to read · {passages} passages indexed"

        if self.llm.configured:
            await self._step(job_id, "enriching", "Writing the AI summary, moods and themes", **named)
            book = await self.db["books"].find_one({"_id": book["_id"]})
            assert book is not None
            try:
                await enrich_book(self.db, self.llm, self.embedder, book)
                note += " · AI insights written"
            except AppError as exc:
                if exc.code is not ErrorCode.AI_UNAVAILABLE:
                    raise
                note += " · AI insights later (models resting)"
        await self._step(job_id, "done", note, **named)
