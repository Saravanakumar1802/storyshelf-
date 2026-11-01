"""
Atlas Vector Search index definitions (the free M0 tier allows three search indexes; we use two).

Unlike regular indexes these build asynchronously on Atlas' search nodes and
take ~30 s to become queryable. They are created once, by the embedding
script, and left alone afterwards.
"""

import asyncio
import logging
import time
from typing import Any

from pymongo.errors import OperationFailure
from pymongo.operations import SearchIndexModel

from app.ai.embeddings import DIMENSIONS
from app.ai.vector_store import BOOKS_INDEX, CHUNKS_INDEX
from app.db.mongo import Database

log = logging.getLogger(__name__)


def _vector(*filters: str) -> dict[str, Any]:
    return {
        "fields": [
            {"type": "vector", "path": "vector", "numDimensions": DIMENSIONS, "similarity": "cosine"},
            *({"type": "filter", "path": f} for f in filters),
        ]
    }


SEARCH_INDEXES: dict[str, tuple[str, dict[str, Any]]] = {
    "books": (BOOKS_INDEX, _vector("status", "genre")),
    "chunks": (CHUNKS_INDEX, _vector("book_id")),
}


async def ensure_search_indexes(db: Database, *, wait_s: float = 0) -> dict[str, str]:
    """Creates missing vector indexes; optionally waits until they are queryable. Returns name -> status."""
    statuses: dict[str, str] = {}
    for collection, (name, definition) in SEARCH_INDEXES.items():
        col = db[collection]
        existing = await (await col.list_search_indexes(name)).to_list()
        if not existing:
            try:
                await col.create_search_index(
                    SearchIndexModel(definition=definition, name=name, type="vectorSearch")
                )
                log.info("Creating vector index %s on %s", name, collection)
            except OperationFailure as exc:  # e.g. the collection doesn't exist yet
                log.warning("Could not create %s: %s", name, exc)
                statuses[name] = "MISSING"
                continue
    deadline = time.monotonic() + wait_s
    while True:
        for collection, (name, _) in SEARCH_INDEXES.items():
            if statuses.get(name) == "MISSING":
                continue
            found = await (await db[collection].list_search_indexes(name)).to_list()
            statuses[name] = (
                "READY"
                if found and found[0].get("queryable")
                else (found[0].get("status", "?") if found else "MISSING")
            )
        if all(s in ("READY", "MISSING") for s in statuses.values()) or time.monotonic() >= deadline:
            return statuses
        await asyncio.sleep(3)
