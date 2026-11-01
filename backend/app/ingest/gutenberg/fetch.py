"""
Polite downloads from a Project Gutenberg mirror.

PG's rules: no scraping of gutenberg.org itself, bulk downloads from mirrors,
and a pause between requests. Each book is downloaded once and kept on disk,
so re-running an import never hits the mirror again.
"""

import asyncio
import time
from pathlib import Path
from types import TracebackType
from typing import Protocol, Self

import httpx

from app.core.config import BACKEND_DIR, Settings

CACHE_DIR = BACKEND_DIR / ".cache" / "gutenberg"
_POLITE_DELAY_S = 2.0


class HtmlSource(Protocol):
    """Anything that can supply a book's HTML; the pipeline takes this so tests can feed fixtures."""

    async def fetch_html(self, gutenberg_id: int) -> str: ...


class FetchError(Exception):
    pass


class GutenbergFetcher:
    def __init__(self, settings: Settings, cache_dir: Path = CACHE_DIR) -> None:
        self._mirror = settings.gutenberg_mirror.rstrip("/")
        self._cache_dir = cache_dir
        self._client = httpx.AsyncClient(
            headers={"User-Agent": settings.http_user_agent},
            timeout=httpx.Timeout(120, connect=15),
            follow_redirects=True,
        )
        self._lock = asyncio.Lock()
        self._last_request = 0.0

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(
        self, exc_type: type[BaseException] | None, exc: BaseException | None, tb: TracebackType | None
    ) -> None:
        await self._client.aclose()

    def url_for(self, gutenberg_id: int) -> str:
        return f"{self._mirror}/cache/epub/{gutenberg_id}/pg{gutenberg_id}-images.html"

    async def fetch_html(self, gutenberg_id: int) -> str:
        cached = self._cache_dir / f"{gutenberg_id}.html"
        if cached.exists():
            return cached.read_text(encoding="utf-8")
        async with self._lock:  # one request at a time, spaced out
            wait = _POLITE_DELAY_S - (time.monotonic() - self._last_request)
            if wait > 0:
                await asyncio.sleep(wait)
            try:
                res = await self._client.get(self.url_for(gutenberg_id))
            finally:
                self._last_request = time.monotonic()
        if res.status_code == 404:
            raise FetchError(f"Book #{gutenberg_id} has no HTML edition on the mirror")
        if res.status_code != 200:
            raise FetchError(f"Mirror answered {res.status_code} for book #{gutenberg_id}")
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        cached.write_text(res.text, encoding="utf-8")
        return res.text
