"""
Nearest-neighbour search over book and passage vectors.

`AtlasVectorIndex` uses MongoDB Atlas Vector Search ($vectorSearch, approximate
HNSW). It lives in the same database as the data, so there is no separate
vector DB to run, sync or pay for. `MemoryVectorIndex` does the same exactly,
by brute force, for tests and for local runs without the Atlas index.
"""

from dataclasses import dataclass
from typing import Any, Protocol

import numpy as np
from bson import ObjectId

from app.ai.embeddings import Vector, from_bson, to_bson
from app.db.mongo import Database, Document

BOOKS_INDEX = "books_vector"
CHUNKS_INDEX = "chunks_vector"
_CANDIDATES_PER_RESULT = 12  # HNSW recall vs. speed; Atlas allows up to 10,000 candidates

PASSAGE_FIELDS = {"book_id": 1, "chapter": 1, "seq": 1, "text": 1}


@dataclass(frozen=True)
class Hit:
    doc: Document
    score: float  # cosine similarity in [0, 1] (Atlas maps cosine to (1 + cos) / 2)


class VectorIndex(Protocol):
    async def search_passages(
        self, vector: Vector, limit: int, *, book_ids: list[ObjectId] | None = None
    ) -> list[Hit]: ...

    async def search_books(
        self, vector: Vector, limit: int, *, genre: str | None = None, exclude: ObjectId | None = None
    ) -> list[Hit]: ...


class AtlasVectorIndex:
    def __init__(self, db: Database) -> None:
        self.books = db["books"]
        self.chunks = db["chunks"]

    async def search_passages(
        self, vector: Vector, limit: int, *, book_ids: list[ObjectId] | None = None
    ) -> list[Hit]:
        # a pre-filter on book_id keeps Ask My Library inside the reader's own books
        filter_ = {"book_id": {"$in": book_ids}} if book_ids is not None else None
        stage = self._stage(CHUNKS_INDEX, vector, limit, filter_)
        return await self._run(self.chunks, stage, PASSAGE_FIELDS)

    async def search_books(
        self, vector: Vector, limit: int, *, genre: str | None = None, exclude: ObjectId | None = None
    ) -> list[Hit]:
        filters: list[dict[str, Any]] = [{"status": "published"}]
        if genre:
            filters.append({"genre": genre})
        stage = self._stage(BOOKS_INDEX, vector, limit + (1 if exclude else 0), {"$and": filters})
        hits = await self._run(self.books, stage, {"vector": 0, "content_vector": 0})
        return [h for h in hits if h.doc["_id"] != exclude][:limit]

    @staticmethod
    def _stage(
        index: str, vector: Vector, limit: int, filter_: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        stage: dict[str, Any] = {
            "index": index,
            "path": "vector",
            "queryVector": to_bson(vector),
            "numCandidates": min(10_000, limit * _CANDIDATES_PER_RESULT),
            "limit": limit,
        }
        if filter_:
            stage["filter"] = filter_
        return {"$vectorSearch": stage}

    @staticmethod
    async def _run(col: Any, stage: dict[str, Any], projection: dict[str, Any]) -> list[Hit]:
        pipeline = [stage, {"$project": {**projection, "score": {"$meta": "vectorSearchScore"}}}]
        docs = await (await col.aggregate(pipeline)).to_list()
        return [Hit(doc=d, score=float(d.pop("score"))) for d in docs]


class MemoryVectorIndex:
    """Exact search over vectors loaded into memory. Same contract, same score scale."""

    def __init__(self, books: list[Document], chunks: list[Document]) -> None:
        self._books = [b for b in books if b.get("vector") is not None]
        self._chunks = [c for c in chunks if c.get("vector") is not None]
        self._book_m = self._matrix(self._books)
        self._chunk_m = self._matrix(self._chunks)

    @classmethod
    async def from_db(cls, db: Database) -> "MemoryVectorIndex":
        books = await db["books"].find({"status": "published"}).to_list()
        chunks = await db["chunks"].find({}, {**PASSAGE_FIELDS, "vector": 1}).to_list()
        return cls(books, chunks)

    @staticmethod
    def _matrix(docs: list[Document]) -> np.ndarray[Any, np.dtype[np.float32]]:
        if not docs:
            return np.zeros((0, 1), dtype=np.float32)
        return np.stack([from_bson(d["vector"]) for d in docs])

    @staticmethod
    def _top(matrix: np.ndarray[Any, Any], vector: Vector, docs: list[Document], limit: int) -> list[Hit]:
        if not docs:
            return []
        sims = matrix @ vector
        order = np.argsort(-sims)[:limit]
        strip = {"vector", "content_vector"}
        return [
            Hit(doc={k: v for k, v in docs[i].items() if k not in strip}, score=(1 + float(sims[i])) / 2)
            for i in order
        ]

    async def search_passages(
        self, vector: Vector, limit: int, *, book_ids: list[ObjectId] | None = None
    ) -> list[Hit]:
        hits = self._top(self._chunk_m, vector, self._chunks, len(self._chunks))
        if book_ids is not None:
            allowed = set(book_ids)
            hits = [h for h in hits if h.doc["book_id"] in allowed]
        return hits[:limit]

    async def search_books(
        self, vector: Vector, limit: int, *, genre: str | None = None, exclude: ObjectId | None = None
    ) -> list[Hit]:
        hits = self._top(self._book_m, vector, self._books, len(self._books))
        hits = [h for h in hits if h.doc["_id"] != exclude and (not genre or h.doc["genre"] == genre)]
        return hits[:limit]
