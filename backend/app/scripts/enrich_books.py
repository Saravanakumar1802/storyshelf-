"""
Write AI insights (summary, hook, themes, moods, tone, …) for every book.

    python -m uv run python -m app.scripts.enrich_books            # books without insights
    python -m uv run python -m app.scripts.enrich_books --limit 5
    python -m uv run python -m app.scripts.enrich_books --reset    # rewrite all (e.g. after a prompt change)

Needs at least one LLM key in .env. Spends a little free quota per book
(~4k tokens in, ~400 out), pauses between books to stay under per-minute
limits, and stops cleanly when every model is resting. Re-run later to finish.
Then refresh the site snapshot: python -m uv run python -m app.scripts.export_catalog
"""

import argparse
import asyncio

from app.ai.embeddings import Embedder
from app.ai.llm.client import build_llm
from app.core.config import get_settings
from app.core.errors import AppError, ErrorCode
from app.core.logging import configure_logging
from app.db.mongo import mongo
from app.modules.insights.service import enrich_book

PAUSE_S = 4.0


async def main(limit: int | None, reset: bool) -> None:
    configure_logging()
    settings = get_settings()
    await mongo.connect(settings)
    llm = build_llm(settings, mongo.db)
    if not llm.configured:
        print("No LLM keys in .env yet; add at least one (see .env.example) and run again.")
        await mongo.close()
        return
    embedder = Embedder(settings.embedding_model)
    try:
        query = {"status": "published"} if reset else {"status": "published", "ai": None}
        books = await mongo.db.books.find(query).sort("featured_rank", 1).to_list()
        books = books[:limit] if limit else books
        print(f"{len(books)} book(s) to enrich")
        done = 0
        for i, book in enumerate(books, 1):
            try:
                ai = await enrich_book(mongo.db, llm, embedder, book)
            except AppError as exc:
                if exc.code is ErrorCode.AI_UNAVAILABLE:
                    print(f"Every model is resting (free quotas). Stopped after {done}; run again later.")
                    break
                raise
            done += 1
            hops = f", after {len(ai.meta.fallbacks)} fallback(s)" if ai.meta.fallbacks else ""
            model = f"{ai.meta.provider} {ai.meta.model}{hops}"
            print(f"[{i:>2}/{len(books)}] {book['title']}: {', '.join(ai.moods)} ({model})")
            await asyncio.sleep(PAUSE_S)
        print(f"\nEnriched {done} book(s). Refresh the site snapshot with app.scripts.export_catalog.")
    finally:
        if llm._log is not None:
            await llm._log.flush()
        await mongo.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(args.limit, args.reset))
