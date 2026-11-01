"""
Embed every book (passages + book vector) and create the Atlas vector indexes.

    python -m uv run python -m app.scripts.embed_library           # books not embedded yet
    python -m uv run python -m app.scripts.embed_library --reset   # everything again (e.g. new model)

Runs on this machine's CPU (no API quota). The whole curated shelf takes a
few minutes; storage is checked against STORAGE_BUDGET_MB as it goes.
"""

import argparse
import asyncio
import time

from app.ai.embeddings import Embedder
from app.ai.indexing import embed_book
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.indexes import ensure_indexes
from app.db.mongo import mongo, storage_used_mb
from app.db.search_indexes import ensure_search_indexes


async def main(reset: bool) -> None:
    configure_logging()
    settings = get_settings()
    await mongo.connect(settings)
    await ensure_indexes(mongo.db)
    embedder = Embedder(settings.embedding_model)
    try:
        query = {"status": "published"} if reset else {"status": "published", "embedded_at": None}
        books = await mongo.db.books.find(query).sort("featured_rank", 1).to_list()
        print(f"{len(books)} book(s) to embed with {settings.embedding_model}")
        total, start = 0, time.perf_counter()
        for i, book in enumerate(books, 1):
            used = await storage_used_mb(mongo.db)
            if used >= settings.storage_budget_mb:
                print(f"Storage budget reached ({used} MB); stopping.")
                break
            n = await embed_book(mongo.db, embedder, book)
            total += n
            print(f"[{i:>2}/{len(books)}] {n:>5} passages  {book['title']}")
        print(f"\n{total} passages in {time.perf_counter() - start:.0f} s.")
        print("Vector indexes:", await ensure_search_indexes(mongo.db, wait_s=180))
        print(f"Database now uses {await storage_used_mb(mongo.db)} MB of {settings.storage_budget_mb} MB.")
    finally:
        await mongo.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--reset", action="store_true", help="re-embed every book")
    asyncio.run(main(parser.parse_args().reset))
