"""
Fill the library with the curated starting shelf.

    python -m uv run python -m app.scripts.ingest_curated            # everything (skips books already in)
    python -m uv run python -m app.scripts.ingest_curated --limit 5  # just the first five
    python -m uv run python -m app.scripts.ingest_curated --reset    # re-parse all (after parser fixes)

Safe to re-run: imported books are skipped, downloads are cached on disk, and
the run stops cleanly once the storage budget is reached.
"""

import argparse
import asyncio

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.indexes import ensure_indexes
from app.db.mongo import mongo, storage_used_mb
from app.ingest.gutenberg.curated import CURATED
from app.ingest.gutenberg.fetch import GutenbergFetcher
from app.ingest.gutenberg.pipeline import import_book


async def main(limit: int | None, reset: bool) -> None:
    configure_logging()
    settings = get_settings()
    await mongo.connect(settings)
    await ensure_indexes(mongo.db)
    if reset:
        # downloads are cached on disk, so a reset re-parses without touching the mirror
        await mongo.db.chapters.delete_many({})
        removed = await mongo.db.books.delete_many({})
        print(f"Reset: removed {removed.deleted_count} books")
    tally: dict[str, int] = {}
    try:
        async with GutenbergFetcher(settings) as fetcher:
            for rank, (gid, label) in enumerate(CURATED[:limit]):
                result = await import_book(mongo.db, settings, fetcher, gid, featured_rank=rank)
                tally[result.status] = tally.get(result.status, 0) + 1
                size = f" ~{result.estimated_mb} MB" if result.estimated_mb else ""
                head = f"[{rank + 1:>2}/{len(CURATED)}] {result.status:<8} #{gid:<6}"
                print(f"{head} {label}{size} — {result.detail}")
                if result.status == "rejected" and result.detail.startswith("Storage budget"):
                    print("Storage budget reached; stopping.")
                    break
        used = await storage_used_mb(mongo.db)
        print(f"\nDone: {tally}. Database now uses {used} MB of the {settings.storage_budget_mb} MB budget.")
    finally:
        await mongo.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--limit", type=int, default=None, help="only the first N curated books")
    parser.add_argument("--reset", action="store_true", help="delete every book first, then re-import")
    args = parser.parse_args()
    asyncio.run(main(args.limit, args.reset))
