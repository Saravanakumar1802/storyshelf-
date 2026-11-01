from typing import Literal

from app.core.schemas import ApiModel
from app.modules.books.schemas import BookSummary

MatchKind = Literal["passage", "meaning", "keyword"]


class MatchedPassage(ApiModel):
    chapter: int
    chapter_title: str
    excerpt: str


class SearchHit(ApiModel):
    book: BookSummary
    score: float
    matched_by: list[MatchKind]
    passage: MatchedPassage | None = None


class SearchResponse(ApiModel):
    query: str
    # "semantic" = meaning + keywords; "keyword" = the embedding model was unavailable
    mode: Literal["semantic", "keyword"]
    items: list[SearchHit]
