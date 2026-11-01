"""
The help assistant in the site's chat bubble: answers questions about
publishing with StoryShelf from the help centre's own FAQs and plan prices.

1. Retrieve: the question is embedded locally and the closest FAQs are picked
   (the FAQs are embedded once, on first use).
2. Answer: the fast model answers from those FAQs only, and picks follow-up
   links from a fixed list, so it can't invent pages or prices.
3. Without a model (no keys, or every quota resting) the closest FAQ's own
   answer is returned, which is what the bubble did before it had AI.

Anything it can't answer is handed to a person: a ticket or a call.
"""

import asyncio
import json
import re
from functools import cache
from pathlib import Path

import numpy as np
from pydantic import BaseModel, Field, field_validator

from app.ai.embeddings import Embedder
from app.ai.llm.client import LlmClient
from app.core.config import BACKEND_DIR
from app.core.errors import AppError, ai_paused
from app.modules.assistant.schemas import AssistantReply, ChatIn, Link, SourceFaq
from app.modules.publishing.pricing import ADDONS, GST_RATE, PLAN_PRICES

FAQS_PATH = BACKEND_DIR.parent / "src" / "data" / "faqs.json"
TOP_K = 4
MIN_SIMILARITY = 0.55  # below this the closest FAQ isn't really about the question
DIRECT_ANSWER_SIMILARITY = 0.6  # quoting an FAQ word for word needs a closer match
_PRICE_WORDS = re.compile(
    r"\b(price|prices|pricing|cost|costs|fee|fees|charges?|how much|rupees)\b|₹", re.IGNORECASE
)
PROMPT_VERSION = 1

LINKS: dict[str, Link] = {
    "plans": Link(href="/plans", label="Compare plans"),
    "journey": Link(href="/publish/how-it-works", label="See the journey"),
    "faq": Link(href="/support/faq", label="More answers"),
    "ticket": Link(href="/support/ticket", label="Raise a ticket"),
    "call": Link(href="/support/consultation", label="Book a call"),
    "publish": Link(href="/publish", label="Start publishing"),
    "royalties": Link(href="/support/guides/understanding-royalties", label="Royalty guide"),
    "library": Link(href="/library", label="Open the library"),
    "contact": Link(href="/contact", label="Contact us"),
}


class Faq(BaseModel):
    id: str
    category: str
    q: str
    a: str


class HelpAnswerOut(BaseModel):
    answer: str = Field(max_length=900)
    links: list[str] = Field(default_factory=list)
    needs_person: bool = False

    @field_validator("links")
    @classmethod
    def _known_links(cls, value: list[str]) -> list[str]:
        # a made-up page is dropped rather than failing the whole answer
        return [k for k in dict.fromkeys(value) if k in LINKS][:3]


@cache
def load_faqs(path: Path = FAQS_PATH) -> tuple[Faq, ...]:
    return tuple(Faq.model_validate(f) for f in json.loads(path.read_text(encoding="utf-8")))


def price_sheet() -> str:
    plans = "; ".join(f"{name} ₹{price:,}" for name, price in PLAN_PRICES.values())
    addons = "; ".join(f"{a.name} ₹{a.price:,}" for a in ADDONS.values())
    return f"Plans (excluding {GST_RATE:.0%} GST): {plans}. Add-ons: {addons}."


SYSTEM = (
    "You are the StoryShelf author-support assistant on the website of an Indian self-publishing "
    "house. Answer the author's question in two to four friendly, plain sentences using ONLY the "
    "FAQs and price sheet below. Never invent prices, dates, policies or promises. If they don't "
    "cover the question, say you're not sure and set needs_person to true. Pick up to three links "
    "from the allowed keys that would help next.\n"
    'Reply with JSON: {"answer": "...", "links": ["plans", ...], "needs_person": false}\n'
    f"Allowed link keys: {', '.join(LINKS)}."
)


class HelpAssistant:
    def __init__(self, llm: LlmClient, embedder: Embedder, faqs: tuple[Faq, ...] | None = None) -> None:
        self.llm = llm
        self.embedder = embedder
        self.faqs = faqs or load_faqs()
        self._vectors: np.ndarray | None = None
        self._lock = asyncio.Lock()

    async def _faq_vectors(self) -> np.ndarray:
        async with self._lock:
            if self._vectors is None:
                vectors = await self.embedder.embed_passages([f"{f.q}\n{f.a}" for f in self.faqs])
                self._vectors = np.stack(vectors)
        return self._vectors

    async def closest(self, question: str) -> list[tuple[Faq, float]]:
        q = await self.embedder.embed_query(question)
        scores = (await self._faq_vectors()) @ q
        order = np.argsort(-scores)[:TOP_K]
        return [(self.faqs[i], float(scores[i])) for i in order]

    async def reply(self, body: ChatIn, user_id: str | None) -> AssistantReply:
        question = body.messages[-1].content
        ranked = await self.closest(question)
        relevant = [(f, s) for f, s in ranked if s >= MIN_SIMILARITY] or ranked[:1]
        sources = [SourceFaq(id=f.id, q=f.q) for f, _ in relevant]
        best, score = ranked[0]
        if self.llm.configured:
            try:
                out, meta = await self.llm.complete_json(
                    HelpAnswerOut,
                    task="help",
                    group="fast",
                    messages=self._messages(body, relevant),
                    max_tokens=400,
                    cache_ttl_s=7 * 86_400,
                    user_id=user_id,
                )
                links = [LINKS[k] for k in out.links]
                if out.needs_person and LINKS["ticket"] not in links:
                    links.append(LINKS["ticket"])
                return AssistantReply(
                    answer=out.answer, links=links, sources=sources, needs_person=out.needs_person, meta=meta
                )
            except AppError as exc:
                if not ai_paused(exc):
                    raise
        # without a model: prices come from the price sheet, other answers only from a close FAQ
        if _PRICE_WORDS.search(question):
            return AssistantReply(answer=price_sheet(), links=[LINKS["plans"], LINKS["call"]], sources=[])
        if score < DIRECT_ANSWER_SIMILARITY:
            return AssistantReply(
                answer="I'm not sure about that one. Let me get a person to help.",
                links=[LINKS["ticket"], LINKS["call"]],
                sources=[],
                needs_person=True,
            )
        return AssistantReply(answer=best.a, links=[LINKS["faq"]], sources=sources[:1])

    def _messages(self, body: ChatIn, faqs: list[tuple[Faq, float]]) -> list[dict[str, str]]:
        context = "\n\n".join(f"Q: {f.q}\nA: {f.a}" for f, _ in faqs)
        history = [{"role": m.role, "content": m.content} for m in body.messages[-6:]]
        return [
            {"role": "system", "content": f"{SYSTEM}\n\nFAQs:\n{context}\n\nPrice sheet: {price_sheet()}"},
            *history,
        ]
