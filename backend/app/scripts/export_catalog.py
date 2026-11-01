"""
Snapshot the library for the static site build.

    python -m uv run python -m app.scripts.export_catalog

The site is a static export, so book pages, the sitemap and the 3D shelf are
built from these snapshots (fast, indexable, no API call needed). Live data
(search, AI, progress) still comes from the API at runtime. Writes:

- src/data/library.featured.generated.json — the featured shelf (small: it ships to browsers)
- src/data/library.catalog.generated.json  — every book with its contents (server-side only)
- src/data/library.slugs.generated.json    — which books have a static page (tiny: ships to browsers)
"""

import asyncio
import json
from datetime import UTC, datetime
from pathlib import Path

from app.ai.embeddings import Embedder
from app.ai.vector_store import AtlasVectorIndex
from app.core.config import BACKEND_DIR, get_settings
from app.db.mongo import mongo
from app.modules.books.service import BooksService
from app.modules.search.service import SearchService

DATA_DIR = BACKEND_DIR.parent / "src" / "data"
FEATURED_COUNT = 12
SIMILAR_COUNT = 8
_PAGE = 48


def _write(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {path.relative_to(BACKEND_DIR.parent)} ({path.stat().st_size / 1024:.0f} KB)")


async def main() -> None:
    settings = get_settings()
    await mongo.connect(settings)
    try:
        service = BooksService(mongo.db)
        summaries = []
        page = 1
        while True:
            batch = await service.search(q="", genre="", sort="featured", page=page, limit=_PAGE)
            summaries += batch.items
            if page >= batch.pages:
                break
            page += 1
        details = [await service.detail(s.slug) for s in summaries]
        # "similar in spirit" from the vector index, so static book pages need no API call for it
        search = SearchService(mongo.db, Embedder(settings.embedding_model), AtlasVectorIndex(mongo.db))
        similar: dict[str, list[str]] = {}
        for d in details:
            try:
                similar[d.slug] = [doc["slug"] for doc in await search.similar(d.slug, SIMILAR_COUNT) or []]
            except Exception as exc:  # index still building: pages fall back to same author / genre
                print(f"similar books unavailable ({exc.__class__.__name__}); skipping")
                break
        genres = await service.genres()
    finally:
        await mongo.close()

    generated_at = datetime.now(UTC).isoformat(timespec="seconds")
    featured = [s.model_dump(mode="json", by_alias=True) for s in summaries if s.featured][:FEATURED_COUNT]
    _write(DATA_DIR / "library.featured.generated.json", {"generatedAt": generated_at, "books": featured})
    _write(
        DATA_DIR / "library.catalog.generated.json",
        {
            "generatedAt": generated_at,
            "genres": [g.model_dump(mode="json", by_alias=True) for g in genres],
            "books": [
                {**d.model_dump(mode="json", by_alias=True), "similar": similar.get(d.slug, [])}
                for d in details
            ],
        },
    )

    _write(DATA_DIR / "library.slugs.generated.json", [d.slug for d in details])


if __name__ == "__main__":
    asyncio.run(main())
