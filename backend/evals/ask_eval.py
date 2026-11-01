"""
Retrieval evals for the two assistants that answer from a fixed body of text.

    python -m uv run python -m evals.ask_eval

1. Ask My Library: with eight books on the shelf, does a question about one of
   them retrieve passages from the right book? Metrics: top passage from the
   right book, and the share of the eight passages that are (precision@8).
   This is the part that works with no LLM keys; the answer can only be as
   good as these passages.
2. Help assistant: does a question find the right FAQ, and does an off-topic
   question score below the "not about this" threshold (so it goes to a person)?

Runs against the real library (needs the embeddings and Atlas vector indexes).
Writes evals/RESULTS_ask.md.
"""

import asyncio
from pathlib import Path

from app.ai.embeddings import Embedder
from app.ai.llm.client import LlmClient
from app.ai.vector_store import AtlasVectorIndex
from app.core.config import get_settings
from app.db.mongo import mongo
from app.modules.ask.service import AskService
from app.modules.assistant.service import MIN_SIMILARITY, HelpAssistant

SHELF = [
    "dracula",
    "frankenstein",
    "pride-and-prejudice",
    "heart-of-darkness",
    "the-time-machine",
    "treasure-island",
    "a-christmas-carol-in-prose",
    "the-adventures-of-sherlock-holmes",
]
ASK_CASES: list[tuple[str, str]] = [
    ("Why does the creature ask Victor to make him a companion?", "frankenstein"),
    ("What happens to Jonathan Harker at the castle?", "dracula"),
    ("How does Mr Darcy first propose to Elizabeth?", "pride-and-prejudice"),
    ("What does Marlow find at the Inner Station?", "heart-of-darkness"),
    ("Who are the Morlocks?", "the-time-machine"),
    ("What is in Billy Bones's sea chest?", "treasure-island"),
    ("What does the last spirit show Scrooge?", "a-christmas-carol-in-prose"),
    ("How does Irene Adler outwit Holmes?", "the-adventures-of-sherlock-holmes"),
    ("What are Kurtz's last words?", "heart-of-darkness"),
    ("What does Van Helsing do to save Lucy?", "dracula"),
    ("Why does Elizabeth refuse Mr Collins?", "pride-and-prejudice"),
    ("What happens to Long John Silver at the end?", "treasure-island"),
    ("What does the Time Traveller see at the end of the world?", "the-time-machine"),
    ("How does the creature learn to speak and read?", "frankenstein"),
]
HELP_CASES: list[tuple[str, str]] = [
    ("how often do you pay royalties", "f6"),
    ("do I keep the rights to my book", "f7"),
    ("will I get an ISBN number", "f8"),
    ("can I pay in instalments or EMI", "f16"),
    ("how long before my book is on amazon", "f12"),
    ("my book is 500 pages long, is that ok", "f3"),
    ("can I switch to a bigger plan later", "f4"),
    ("is GST included in the price", "f2"),
    ("will the editor rewrite my style", "f13"),
    ("do you print copies only when someone orders", "f11"),
    ("what if I hate the cover", "f14"),
    ("can I get a refund if I cancel", "f17"),
]
OFF_TOPIC = ["what's the weather in Delhi", "who won the cricket world cup", "write me a poem about cats"]


async def ask_eval(service: AskService) -> tuple[float, float, list[str]]:
    books = await mongo.db.books.find({"slug": {"$in": SHELF}}, {"slug": 1}).to_list()
    ids = [b["_id"] for b in books]
    assert len(ids) == len(SHELF), "a shelf book is missing from the library"
    top = share = 0.0
    misses = []
    for q, want in ASK_CASES:
        sources, _ = await service._retrieve(q, ids)
        slugs = [s.book.slug for s in sources]
        top += bool(slugs) and slugs[0] == want
        share += slugs.count(want) / max(1, len(slugs))
        if not slugs or slugs[0] != want:
            misses.append(f"  {q!r}: wanted {want}, top passage from {slugs[0] if slugs else '-'}")
    n = len(ASK_CASES)
    return top / n, share / n, misses


async def help_eval(helper: HelpAssistant) -> tuple[float, float, list[str]]:
    right = 0
    misses = []
    for q, want in HELP_CASES:
        best, score = (await helper.closest(q))[0]
        right += best.id == want
        if best.id != want:
            misses.append(f"  {q!r}: wanted {want}, got {best.id} ({score:.2f})")
    refused = 0
    for q in OFF_TOPIC:
        _, score = (await helper.closest(q))[0]
        refused += score < MIN_SIMILARITY
        if score >= MIN_SIMILARITY:
            misses.append(f"  off-topic {q!r} scored {score:.2f} (would be answered)")
    return right / len(HELP_CASES), refused / len(OFF_TOPIC), misses


async def main() -> None:
    settings = get_settings()
    await mongo.connect(settings)
    embedder = Embedder(settings.embedding_model)
    no_llm = LlmClient({})
    try:
        top, share, ask_misses = await ask_eval(
            AskService(mongo.db, no_llm, embedder, AtlasVectorIndex(mongo.db))
        )
        print(f"Ask My Library: top passage right book {top:.0%}, precision@8 {share:.0%}")
        print("\n".join(ask_misses) or "  every top passage from the right book")
        faq, refused, help_misses = await help_eval(HelpAssistant(no_llm, embedder))
        print(f"Help assistant: right FAQ {faq:.0%}, off-topic sent to a person {refused:.0%}")
        print("\n".join(help_misses) or "  no misses")
    finally:
        await mongo.close()

    lines = [
        "# Ask & help evals",
        "",
        "Retrieval only (`evals/ask_eval.py`): no LLM keys needed, and the answers can only be"
        " as good as this.",
        "",
        "| eval | cases | result |",
        "|---|---|---|",
        f"| Ask My Library · top passage from the right book (8-book shelf) | {len(ASK_CASES)} | {top:.0%} |",
        f"| Ask My Library · passages from the right book (precision@8) | {len(ASK_CASES)} | {share:.0%} |",
        f"| Help assistant · right FAQ first | {len(HELP_CASES)} | {faq:.0%} |",
        f"| Help assistant · off-topic handed to a person | {len(OFF_TOPIC)} | {refused:.0%} |",
        "",
        "Misses:",
        "",
        "```",
        *(ask_misses + help_misses or ["none"]),
        "```",
    ]
    report = Path(__file__).with_name("RESULTS_ask.md")
    report.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nwrote {report.name}")


if __name__ == "__main__":
    asyncio.run(main())
