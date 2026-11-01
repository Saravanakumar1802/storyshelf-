"""
Search the library by meaning, not just by words.

"a lonely voyage that ends in madness" has no title in common with
Heart of Darkness, so for every query we ask three questions:

1. Which *passages* read most like this? Atlas vector search over every
   chunk of every book. Each book keeps its best passage, which becomes the
   "found in chapter 12" excerpt shown with the result.
2. Which *books* are most like this? Vector search over book vectors
   (identity + summary + overall content).
3. Which books *mention* these words? MongoDB full-text search, so exact titles and names still win.

The three rankings are merged with Reciprocal Rank Fusion: a book scores
1/(60 + rank) in each list it appears in. RRF needs no tuning and no score
normalisation between very different signals, and a book that ranks well in
several lists rises to the top.

If the embedding model can't run, search quietly degrades to keywords only.
"""

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

from bson import ObjectId

from app.ai.embeddings import Embedder, from_bson
from app.ai.vector_store import Hit, VectorIndex
from app.db.mongo import Database, Document
from app.modules.books.repository import PUBLISHED, SUMMARY_FIELDS
from app.modules.books.service import to_summary
from app.modules.search.schemas import MatchedPassage, MatchKind, SearchHit, SearchResponse

log = logging.getLogger(__name__)

RRF_K = 60
# Keyword hits matter for short lookups ("dracula", "jane austen"). On descriptions of four or more
# words they only add noise ("a lonely voyage into madness" keyword-matches every book with a voyage),
# and meaning already finds named characters. Measured with evals/search_eval.py (see evals/RESULTS.md):
# long-query keyword weight 0.3 -> MRR 0.922, 0.0 -> MRR 0.946 on 23 queries. Weighting book meaning
# above passages was tried and made results worse, so all three lists count equally otherwise; so was
# summing every passage of a book instead of its best one (MRR 0.910 -> 0.880 on 25 queries).
# Known gap: a book without AI insights has a thin profile vector, so one excellent passage alone
# can't lift it far (see the Importance of Being Earnest cases in the eval); enrichment fixes that.
SHORT_QUERY_WORDS = 3
KEYWORD_WEIGHT_SHORT = 1.0
KEYWORD_WEIGHT_LONG = 0.0
MEANING_WEIGHT = 1.0
PASSAGE_POOL = 60  # passages are many per book, so cast a wider net
BOOK_POOL = 20
KEYWORD_POOL = 20
EXCERPT_CHARS = 280


@dataclass
class _Candidate:
    score: float = 0.0
    matched_by: list[MatchKind] = field(default_factory=list)
    passage: Document | None = None


def excerpt(text: str, limit: int = EXCERPT_CHARS) -> str:
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    cut = text.rfind(". ", 0, limit)
    return text[: cut + 1] if cut > limit // 2 else text[:limit].rsplit(" ", 1)[0] + "…"


def keyword_weight(q: str) -> float:
    return KEYWORD_WEIGHT_SHORT if len(q.split()) <= SHORT_QUERY_WORDS else KEYWORD_WEIGHT_LONG


def fuse(
    passages: list[Hit], books: list[Hit], keywords: list[Document], keyword_w: float = 1.0
) -> dict[ObjectId, _Candidate]:
    """Weighted Reciprocal Rank Fusion over the three result lists (see module docstring)."""
    found: dict[ObjectId, _Candidate] = defaultdict(_Candidate)
    rank = 0
    for hit in passages:  # best passage per book only
        book_id = hit.doc["book_id"]
        if book_id in found:
            continue
        rank += 1
        c = found[book_id]
        c.score += 1 / (RRF_K + rank)
        c.matched_by.append("passage")
        c.passage = hit.doc
    for rank, hit in enumerate(books, 1):
        c = found[hit.doc["_id"]]
        c.score += MEANING_WEIGHT / (RRF_K + rank)
        c.matched_by.append("meaning")
    for rank, doc in enumerate(keywords, 1):
        c = found[doc["_id"]]
        c.score += keyword_w / (RRF_K + rank)
        c.matched_by.append("keyword")
    return found


class SearchService:
    def __init__(self, db: Database, embedder: Embedder, vectors: VectorIndex) -> None:
        self.books = db["books"]
        self.chapters = db["chapters"]
        self.embedder = embedder
        self.vectors = vectors

    async def search(self, q: str, *, genre: str | None = None, limit: int = 12) -> SearchResponse:
        keywords = await self._keyword(q, genre)
        try:
            vector = await self.embedder.embed_query(q)
            passages = await self.vectors.search_passages(vector, PASSAGE_POOL)
            book_hits = await self.vectors.search_books(vector, BOOK_POOL, genre=genre)
            mode = "semantic"
        except Exception:  # model missing, index building, Atlas hiccup: keywords still answer
            log.exception("Semantic search unavailable; falling back to keywords")
            passages, book_hits, mode = [], [], "keyword"

        found = fuse(passages, book_hits, keywords, keyword_weight(q))
        books = await self._books(list(found), genre)
        ranked = sorted(books, key=lambda b: -found[b["_id"]].score)[:limit]
        titles = await self._chapter_titles([found[b["_id"]].passage for b in ranked])
        items = [self._hit(b, found[b["_id"]], titles) for b in ranked]
        return SearchResponse(query=q, mode=mode, items=items)

    async def _keyword(self, q: str, genre: str | None) -> list[Document]:
        query: dict[str, Any] = {"status": PUBLISHED, "$text": {"$search": q}}
        if genre:
            query["genre"] = genre
        cursor = self.books.find(query, {"_id": 1, "score": {"$meta": "textScore"}})
        return await cursor.sort([("score", {"$meta": "textScore"})]).limit(KEYWORD_POOL).to_list()

    async def _books(self, ids: list[ObjectId], genre: str | None) -> list[Document]:
        query: dict[str, Any] = {"_id": {"$in": ids}, "status": PUBLISHED}
        if genre:  # passage hits aren't genre-filtered at the index, so filter here
            query["genre"] = genre
        return await self.books.find(query, SUMMARY_FIELDS).to_list()

    async def _chapter_titles(self, passages: list[Document | None]) -> dict[tuple[Any, int], str]:
        keys = [{"book_id": p["book_id"], "index": p["chapter"]} for p in passages if p]
        if not keys:
            return {}
        docs = await self.chapters.find({"$or": keys}, {"book_id": 1, "index": 1, "title": 1}).to_list()
        return {(d["book_id"], d["index"]): d["title"] for d in docs}

    @staticmethod
    def _hit(book: Document, c: _Candidate, titles: dict[tuple[Any, int], str]) -> SearchHit:
        passage = None
        if c.passage is not None:
            key = (c.passage["book_id"], c.passage["chapter"])
            passage = MatchedPassage(
                chapter=c.passage["chapter"],
                chapter_title=titles.get(key, f"Chapter {c.passage['chapter'] + 1}"),
                excerpt=excerpt(c.passage["text"]),
            )
        return SearchHit(
            book=to_summary(book), score=round(c.score, 5), matched_by=c.matched_by, passage=passage
        )

    async def similar(self, slug: str, limit: int = 8) -> list[Document] | None:
        """Books closest in meaning to this one; None if the book doesn't exist."""
        book = await self.books.find_one({"slug": slug, "status": PUBLISHED}, {"vector": 1})
        if book is None:
            return None
        if book.get("vector") is None:  # not embedded yet
            return []
        hits = await self.vectors.search_books(from_bson(book["vector"]), limit, exclude=book["_id"])
        return [h.doc for h in hits]
