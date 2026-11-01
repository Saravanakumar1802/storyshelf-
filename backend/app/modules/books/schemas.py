from typing import Literal

from app.core.schemas import ApiModel
from app.modules.insights.schemas import BookAi, ChapterAi

SortKey = Literal["featured", "title", "author", "shortest", "longest"]


class Trim(ApiModel):
    width: int
    height: int


class Cover(ApiModel):
    """Everything the site's cover painter needs to draw this book (2D and 3D)."""

    emblem: str
    finish: Literal["cloth", "jacket", "paperback"]
    swatch: int
    trim: Trim
    pages: int


class Contributor(ApiModel):
    name: str
    role: str
    years: str | None = None


class Source(ApiModel):
    name: str
    url: str


class BookSummary(ApiModel):
    id: str
    slug: str
    title: str
    subtitle: str | None = None
    author: str
    author_years: str | None = None
    genre: str
    language: str
    cover: Cover
    words: int
    reading_minutes: int
    chapter_count: int
    opening: str
    featured: bool
    # AI insights, once the book has been enriched (null until then)
    ai: BookAi | None = None


class TocEntry(ApiModel):
    index: int
    title: str
    words: int


class BookDetail(BookSummary):
    contributors: list[Contributor]
    subjects: list[str]
    source: Source
    toc: list[TocEntry]


class BookPage(ApiModel):
    items: list[BookSummary]
    total: int
    page: int
    pages: int


class GenreCount(ApiModel):
    genre: str
    count: int


class ChapterBook(ApiModel):
    slug: str
    title: str
    author: str


class ChapterOut(ApiModel):
    book: ChapterBook
    index: int
    title: str
    paragraphs: list[str]
    words: int
    total: int
    prev: int | None
    next: int | None
    ai: ChapterAi | None = None
