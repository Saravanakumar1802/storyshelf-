"""
Make a book searchable by meaning.

1. Every chapter is cut into passages (chunking.py), each embedded and stored
   in `chunks`. These power passage search and, later, Ask My Library.
2. The book gets one vector of its own, blending what it *is* (title, author,
   subjects, opening and, once enriched, its AI summary, themes and moods) with
   what it *contains* (the mean of its passage vectors). That vector powers
   "similar in spirit", mood matching and book-level search.

The content mean is stored too, so the book vector can be re-blended when the
AI summary arrives without re-embedding every passage.
"""

import logging
from datetime import UTC, datetime
from typing import Any

import numpy as np
from bson import ObjectId

from app.ai.chunking import Passage, chunk_chapter
from app.ai.embeddings import Embedder, Vector, from_bson, normalise, to_bson
from app.db.mongo import Database, Document

log = logging.getLogger(__name__)

PROFILE_WEIGHT = 0.6  # identity vs. content in the book vector
_INSERT_BATCH = 500


def profile_text(book: Document) -> str:
    parts = [book["title"], book.get("subtitle") or "", f"by {book['author']}", book["genre"]]
    parts += [s.replace(" -- ", ", ") for s in book.get("subjects", [])]
    ai = book.get("ai") or {}
    if ai:
        parts += [ai.get("summary", ""), "Themes: " + ", ".join(ai.get("themes", []))]
        parts += ["Mood: " + ", ".join(ai.get("moods", [])), ai.get("tone", "")]
    else:
        parts.append(book.get("opening", ""))
    return ". ".join(p for p in parts if p)


def blend(profile: Vector, content: Vector | None) -> Vector:
    if content is None:
        return normalise(profile)
    return normalise(PROFILE_WEIGHT * profile + (1 - PROFILE_WEIGHT) * content)


async def embed_book(db: Database, embedder: Embedder, book: Document) -> int:
    """(Re)builds a book's passages and vector. Returns the number of passages."""
    book_id: ObjectId = book["_id"]
    chapters = await db["chapters"].find({"book_id": book_id}).sort("index", 1).to_list()
    passages: list[Passage] = []
    for ch in chapters:
        passages += chunk_chapter(ch["index"], ch["paragraphs"], start_seq=len(passages))
    vectors = await embedder.embed_passages([p.text for p in passages]) if passages else []

    await db["chunks"].delete_many({"book_id": book_id})
    docs: list[dict[str, Any]] = [
        {"book_id": book_id, "chapter": p.chapter, "seq": p.seq, "text": p.text, "vector": to_bson(v)}
        for p, v in zip(passages, vectors, strict=True)
    ]
    for i in range(0, len(docs), _INSERT_BATCH):
        await db["chunks"].insert_many(docs[i : i + _INSERT_BATCH], ordered=False)

    content = normalise(np.mean(np.stack(vectors), axis=0).astype(np.float32)) if vectors else None
    (profile,) = await embedder.embed_passages([profile_text(book)])
    await db["books"].update_one(
        {"_id": book_id},
        {
            "$set": {
                "vector": to_bson(blend(profile, content)),
                "content_vector": to_bson(content) if content is not None else None,
                "passage_count": len(passages),
                "embedded_at": datetime.now(UTC),
            }
        },
    )
    return len(passages)


async def refresh_book_vector(db: Database, embedder: Embedder, book: Document) -> None:
    """Re-blends the book vector after its profile changed (e.g. the AI summary arrived)."""
    stored = book.get("content_vector")
    content = from_bson(stored) if stored is not None else None
    (profile,) = await embedder.embed_passages([profile_text(book)])
    await db["books"].update_one({"_id": book["_id"]}, {"$set": {"vector": to_bson(blend(profile, content))}})
