"""The import pipeline and the public books API, end to end on the test database (no network)."""

from pathlib import Path

import pytest
from httpx import AsyncClient

from app.core.config import Settings
from app.db.mongo import Database
from app.ingest.gutenberg.pipeline import import_book

pytestmark = pytest.mark.integration

FIXTURE = (Path(__file__).parents[1] / "fixtures" / "pg_sample.html").read_text(encoding="utf-8")
SHORT_OK = 50  # the fixture is a ~200-word miniature book


class FixtureSource:
    def __init__(self, html: str) -> None:
        self.html = html
        self.calls = 0

    async def fetch_html(self, gutenberg_id: int) -> str:
        self.calls += 1
        return self.html


@pytest.fixture(scope="module")
async def lantern(it_db: Database, it_settings: Settings) -> str:
    result = await import_book(
        it_db, it_settings, FixtureSource(FIXTURE), 900001, featured_rank=0, min_words=SHORT_OK
    )
    assert result.status == "imported", result.detail
    assert result.slug
    return result.slug


async def test_reimport_is_skipped_without_fetching(
    it_db: Database, it_settings: Settings, lantern: str
) -> None:
    source = FixtureSource(FIXTURE)
    result = await import_book(it_db, it_settings, source, 900001)
    assert result.status == "skipped" and source.calls == 0


async def test_copyrighted_book_is_rejected_and_not_stored(it_db: Database, it_settings: Settings) -> None:
    html = FIXTURE.replace(
        "Public domain in the USA.", "Copyrighted. Read the copyright notice inside this book."
    )
    result = await import_book(it_db, it_settings, FixtureSource(html), 900002, min_words=SHORT_OK)
    assert result.status == "rejected" and "Licence" in result.detail
    assert await it_db.books.count_documents({"gutenberg_id": 900002}) == 0


async def test_storage_budget_blocks_imports(it_db: Database, it_settings: Settings) -> None:
    tight = it_settings.model_copy(update={"storage_budget_mb": 0})
    result = await import_book(
        it_db, tight, FixtureSource(FIXTURE.replace("Lantern", "Beacon")), 900003, min_words=SHORT_OK
    )
    assert result.status == "rejected" and result.detail.startswith("Storage budget")


async def test_list_search_and_genres(api: AsyncClient, lantern: str) -> None:
    page = (await api.get("/api/v1/books")).json()
    assert page["total"] >= 1 and page["page"] == 1
    item = next(b for b in page["items"] if b["slug"] == lantern)
    assert item["genre"] == "Adventure" and item["featured"] is True
    assert set(item["cover"]) == {"emblem", "finish", "swatch", "trim", "pages"}
    assert "subjects" not in item  # lists stay light

    found = (await api.get("/api/v1/books", params={"q": "lantern"})).json()
    assert [b["slug"] for b in found["items"]] == [lantern]
    none = (await api.get("/api/v1/books", params={"q": "zebra spaceship"})).json()
    assert none["total"] == 0

    genres = (await api.get("/api/v1/books/genres")).json()
    # other test modules add books too, so check presence rather than an exact count
    assert any(g["genre"] == "Adventure" and g["count"] >= 1 for g in genres)


async def test_detail_and_reader(api: AsyncClient, lantern: str) -> None:
    detail = (await api.get(f"/api/v1/books/{lantern}")).json()
    assert detail["author"] == "Edith Mary Hale" and detail["authorYears"] == "1840–1901"
    assert detail["source"]["url"] == "https://www.gutenberg.org/ebooks/900001"
    assert [t["index"] for t in detail["toc"]] == list(range(detail["chapterCount"]))

    first = (await api.get(f"/api/v1/books/{lantern}/chapters/0")).json()
    assert first["prev"] is None and first["next"] == 1 and first["book"]["slug"] == lantern
    assert first["paragraphs"][0].startswith("The keeper climbed")
    last_index = detail["chapterCount"] - 1
    last = (await api.get(f"/api/v1/books/{lantern}/chapters/{last_index}")).json()
    assert last["next"] is None


async def test_missing_book_and_chapter_are_404(api: AsyncClient, lantern: str) -> None:
    assert (await api.get("/api/v1/books/no-such-book")).status_code == 404
    res = await api.get(f"/api/v1/books/{lantern}/chapters/99")
    assert res.status_code == 404 and res.json()["error"]["code"] == "NOT_FOUND"
