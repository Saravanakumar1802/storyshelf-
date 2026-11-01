"""
Recommendations, in two steps: retrieve by meaning, then let a model choose and explain.

Because you read…
    1. Taste vector: the weighted mean of the reader's shelf book vectors
       (finished 1.0, reading 0.8, want-to-read 0.5).
    2. Retrieve: the nearest books not already on their shelves (vector search, free).
    3. Explain: the smart model picks the best six and writes a reason that
       names a book from their shelf. If no model is available, the vector
       order stands and each pick is explained by its nearest shelf book.

By mood…
    1. Understand: the fast model turns "something short and hopeful for a
       rainy evening" into moods, themes, a time limit and a search sentence
       (cached; a keyword fallback works with no model at all).
    2. Retrieve: vector search on that sentence; books whose AI moods overlap
       get a boost; anything over the time limit is dropped.
    3. Explain: one fast call writes a "why it fits" line for each pick.

Retrieval never spends quota, so recommendations keep working when every
model is resting. Only the reasons get plainer.
"""

import logging
import re
from typing import Any

import numpy as np
from bson import ObjectId

from app.ai.embeddings import Embedder, Vector, from_bson, normalise
from app.ai.llm.client import LlmClient
from app.ai.prompts import (
    MoodQueryOut,
    PicksOut,
    mood_query_messages,
    picks_for_mood_messages,
    picks_for_reader_messages,
)
from app.ai.schemas import AiMeta
from app.ai.vector_store import VectorIndex
from app.core.errors import AppError, ai_paused
from app.db.mongo import Database, Document
from app.modules.books.repository import PUBLISHED, SUMMARY_FIELDS
from app.modules.books.service import to_summary
from app.modules.recommendations.schemas import (
    Interpreted,
    MoodIn,
    MoodRecommendations,
    ReaderRecommendations,
    Recommendation,
)

log = logging.getLogger(__name__)

SHELF_WEIGHT = {"finished": 1.0, "reading": 0.8, "want": 0.5}
READER_PICKS = 6
MOOD_PICKS = 8
CANDIDATES = 18
MOOD_BOOST = 0.04  # per shared mood, on a cosine scale where neighbours differ by ~0.01-0.05
CACHE_S = 86_400

# no-model fallback for reading a mood from text
_MOOD_WORDS: dict[str, tuple[str, ...]] = {
    "cozy": ("cozy", "cosy", "comfort", "warm", "gentle", "rainy"),
    "dark": ("dark", "grim", "bleak", "sinister"),
    "adventurous": ("adventure", "quest", "journey", "voyage", "explore"),
    "hopeful": ("hope", "uplifting", "optimistic", "heartwarming"),
    "romantic": ("romance", "romantic", "love"),
    "mind-bending": ("mind", "strange", "surreal", "twist", "weird"),
    "melancholic": ("sad", "melancholy", "melancholic", "grief", "bittersweet"),
    "funny": ("funny", "comic", "humour", "humor", "laugh", "witty"),
    "suspenseful": ("suspense", "thrill", "tense", "mystery", "scary"),
    "reflective": ("reflective", "thoughtful", "philosoph", "quiet"),
    "whimsical": ("whimsical", "magical", "fairy", "playful"),
    "epic": ("epic", "grand", "war", "saga", "heroic"),
}
_SHORT = re.compile(r"\b(short|quick|brief|one (evening|sitting|night))\b", re.I)


def _about(book: Document) -> str:
    ai = book.get("ai") or {}
    return str(ai.get("hook") or book.get("opening", ""))[:220]


def _candidate(book: Document) -> dict[str, str]:
    return {
        "slug": book["slug"],
        "title": book["title"],
        "author": book["author"],
        "genre": book["genre"],
        "about": _about(book),
    }


def interpret_without_ai(body: MoodIn) -> Interpreted:
    text = (body.text or "").lower()
    moods = list(body.moods) + [
        m for m, words in _MOOD_WORDS.items() if m not in body.moods and any(w in text for w in words)
    ]
    max_minutes = body.max_minutes or (180 if _SHORT.search(text) else None)
    search = " ".join(filter(None, [body.text, ", ".join(moods[:4]) and f"A {', '.join(moods[:4])} book"]))
    return Interpreted(
        moods=moods[:4], themes=[], max_minutes=max_minutes, search_text=search or "a great classic book"
    )


class RecommendationService:
    def __init__(self, db: Database, llm: LlmClient, embedder: Embedder, vectors: VectorIndex) -> None:
        self.db = db
        self.llm = llm
        self.embedder = embedder
        self.vectors = vectors

    # ── because you read… ──

    async def for_reader(self, user_id: str) -> ReaderRecommendations:
        rows = await self.db["shelf_items"].find({"user_id": ObjectId(user_id)}).to_list(500)
        if not rows:
            return ReaderRecommendations(
                items=[], basis=[], note="Add a few books to your shelves and we'll find what to read next."
            )
        status = {r["book_id"]: r["status"] for r in rows}
        shelf = await self.db["books"].find({"_id": {"$in": list(status)}, "vector": {"$ne": None}}).to_list()
        if not shelf:
            return ReaderRecommendations(
                items=[], basis=[], note="Your shelf books are still being indexed; check back shortly."
            )

        vectors = {b["_id"]: from_bson(b["vector"]) for b in shelf}
        weights = np.array([SHELF_WEIGHT[status[b["_id"]]] for b in shelf], dtype=np.float32)
        taste = normalise((np.stack([vectors[b["_id"]] for b in shelf]) * weights[:, None]).sum(axis=0))
        hits = await self.vectors.search_books(taste, CANDIDATES + len(shelf))
        candidates = [h.doc for h in hits if h.doc["_id"] not in status][:CANDIDATES]
        # search hits leave vectors out; fetch the candidates' to find each one's nearest shelf book
        stored = (
            await self.db["books"]
            .find({"_id": {"$in": [c["_id"] for c in candidates]}}, {"vector": 1})
            .to_list()
        )
        candidate_vectors = {d["_id"]: from_bson(d["vector"]) for d in stored}
        anchors = {c["_id"]: self._nearest(candidate_vectors[c["_id"]], shelf, vectors) for c in candidates}
        basis = [b["title"] for b in shelf]

        picks, meta = await self._explain(
            picks_for_reader_messages(
                [f"{b['title']} by {b['author']} ({status[b['_id']]})" for b in shelf],
                [_candidate(c) for c in candidates],
                READER_PICKS,
            ),
            task="recommend",
            group="smart",
            user_id=user_id,
        )
        by_slug = {c["slug"]: c for c in candidates}
        if picks:
            chosen = [(by_slug[slug], reason) for slug, reason in picks if slug in by_slug][:READER_PICKS]
        else:
            chosen = [(c, f"Close in spirit to {anchors[c['_id']]}.") for c in candidates[:READER_PICKS]]
        items = await self._items(chosen, anchors, ai_written=bool(picks))
        return ReaderRecommendations(items=items, basis=basis, meta=meta)

    @staticmethod
    def _nearest(candidate: Vector, shelf: list[Document], vectors: dict[Any, Vector]) -> str:
        """The shelf book a candidate is closest to, for the "because you read" line."""
        best = max(shelf, key=lambda b: float(vectors[b["_id"]] @ candidate))
        return str(best["title"])

    # ── by mood ──

    async def by_mood(self, body: MoodIn, user_id: str | None) -> MoodRecommendations:
        interpreted, parse_meta = await self._interpret(body, user_id)
        query = await self.embedder.embed_query(interpreted.search_text)
        hits = await self.vectors.search_books(query, 40)
        wanted = set(interpreted.moods)
        scored = []
        for h in hits:
            book = h.doc
            if interpreted.max_minutes and book["reading_minutes"] > interpreted.max_minutes:
                continue
            shared = wanted & set((book.get("ai") or {}).get("moods", []))
            scored.append((h.score + MOOD_BOOST * len(shared), book, shared))
        scored.sort(key=lambda s: -s[0])
        top = scored[:MOOD_PICKS]

        picks, meta = (
            await self._explain(
                picks_for_mood_messages(
                    body.text or ", ".join(interpreted.moods), [_candidate(b) for _, b, _ in top]
                ),
                task="mood",
                group="fast",
                user_id=user_id,
            )
            if top
            else ({}, None)
        )
        reasons = dict(picks)
        chosen = []
        for _, book, shared in top:
            fallback = f"Matches: {', '.join(sorted(shared))}." if shared else "Close to what you described."
            chosen.append((book, reasons.get(book["slug"], fallback)))
        items = await self._items(chosen, {}, ai_written=bool(reasons))
        return MoodRecommendations(items=items, interpreted=interpreted, parse_meta=parse_meta, meta=meta)

    async def _interpret(self, body: MoodIn, user_id: str | None) -> tuple[Interpreted, AiMeta | None]:
        if not body.text or not self.llm.configured:
            return interpret_without_ai(body), None
        try:
            out, meta = await self.llm.complete_json(
                MoodQueryOut,
                task="mood",
                group="fast",
                messages=mood_query_messages(body.text),
                max_tokens=300,
                cache_ttl_s=CACHE_S,
                user_id=user_id,
            )
        except AppError as exc:
            if not ai_paused(exc):
                raise
            return interpret_without_ai(body), None
        moods = list(dict.fromkeys([*body.moods, *out.moods]))[:4]
        return (
            Interpreted(
                moods=moods,
                themes=out.themes,
                max_minutes=body.max_minutes or out.max_minutes,
                search_text=out.search_text,
            ),
            meta,
        )

    # ── shared ──

    async def _explain(
        self, messages: list[dict[str, str]], *, task: str, group: Any, user_id: str | None
    ) -> tuple[list[tuple[str, str]], AiMeta | None]:
        if not self.llm.configured:
            return [], None
        try:
            out, meta = await self.llm.complete_json(
                PicksOut,
                task=task,
                group=group,
                messages=messages,
                max_tokens=900,
                cache_ttl_s=CACHE_S,
                user_id=user_id,
            )
        except AppError as exc:
            if not ai_paused(exc):
                raise
            log.info("No model available for %s reasons; using vector order", task)
            return [], None
        return [(p.slug, p.reason) for p in out.picks], meta

    async def _items(
        self, chosen: list[tuple[Document, str]], anchors: dict[Any, str], *, ai_written: bool
    ) -> list[Recommendation]:
        ids = [b["_id"] for b, _ in chosen]
        fresh = {
            b["_id"]: b
            for b in await self.db["books"]
            .find({"_id": {"$in": ids}, "status": PUBLISHED}, SUMMARY_FIELDS)
            .to_list()
        }
        return [
            Recommendation(
                book=to_summary(fresh[b["_id"]]),
                reason=reason,
                because=anchors.get(b["_id"]),
                ai_written=ai_written,
            )
            for b, reason in chosen
            if b["_id"] in fresh
        ]
