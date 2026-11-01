"""
Search relevance eval: does a described book come back, and how high?

    python -m uv run python -m evals.search_eval            # current settings
    python -m uv run python -m evals.search_eval --sweep    # compare keyword weights

Each case is a query a reader might type and the book it should find, from
title lookups ("dracula") to descriptions that share no words with the title.
Metrics: hit@1, hit@3 and MRR (mean reciprocal rank, 1.0 = always first).
Runs against the real library (needs the embeddings and Atlas vector indexes).
"""

import argparse
import asyncio
from pathlib import Path

from app.ai.embeddings import Embedder
from app.ai.vector_store import AtlasVectorIndex
from app.core.config import get_settings
from app.db.mongo import mongo
from app.modules.search import service as search_module
from app.modules.search.service import SearchService

CASES: list[tuple[str, str]] = [
    ("dracula", "dracula"),
    ("jane austen", "pride-and-prejudice"),
    ("sherlock holmes", "the-adventures-of-sherlock-holmes"),
    ("a lonely voyage up a river into madness", "heart-of-darkness"),
    ("a monster made from dead bodies wants a companion", "frankenstein"),
    ("a detective and a giant hound on the moors", "the-hound-of-the-baskervilles"),
    ("witty courtship and class in English country society", "pride-and-prejudice"),
    ("a girl falls down a rabbit hole into a strange world", "alice-s-adventures-in-wonderland"),
    ("a man travels to the far future and meets the Eloi", "the-time-machine"),
    ("a sled dog in the Klondike gold rush returns to the wild", "the-call-of-the-wild"),
    ("a poor student murders a pawnbroker and is tormented by guilt", "crime-and-punishment"),
    ("an orphan governess falls in love with her mysterious employer", "jane-eyre"),
    ("a pirate treasure map and a one-legged cook", "treasure-island"),
    ("devotional song offerings to god", "gitanjali"),
    ("a portrait ages while its owner stays young", "the-picture-of-dorian-gray"),
    ("a miser visited by three ghosts on christmas eve", "a-christmas-carol-in-prose"),
    ("martians invade england with heat rays", "the-war-of-the-worlds"),
    ("a boy and a runaway slave on a raft down the mississippi", "adventures-of-huckleberry-finn"),
    ("four sisters growing up during the civil war", "little-women"),
    ("a scientist makes himself unseen and goes mad", "the-invisible-man"),
    # descriptions that name a character: where keywords should still help
    ("the story of Elizabeth Bennet and Mr Darcy", "pride-and-prejudice"),
    ("Captain Nemo and his submarine under the oceans", "twenty-thousand-leagues-under-the-sea"),
    ("Phileas Fogg wagers he can circle the globe", "around-the-world-in-eighty-days"),
    # a play imported later from the admin console (no AI insights yet: passages carry it)
    ("a baby found in a handbag at a railway station", "the-importance-of-being-earnest"),
    ("Lady Bracknell interviews a suitor", "the-importance-of-being-earnest"),
]


async def run(service: SearchService) -> tuple[float, float, float, list[str]]:
    hit1 = hit3 = mrr = 0.0
    misses = []
    for q, want in CASES:
        result = await service.search(q, limit=10)
        slugs = [h.book.slug for h in result.items]
        rank = slugs.index(want) + 1 if want in slugs else None
        hit1 += rank == 1
        hit3 += rank is not None and rank <= 3
        mrr += 1 / rank if rank else 0
        if rank != 1:
            misses.append(f"  {q!r}: wanted {want}, got rank {rank} (top: {slugs[0] if slugs else '-'})")
    n = len(CASES)
    return hit1 / n, hit3 / n, mrr / n, misses


async def main(sweep: bool) -> None:
    settings = get_settings()
    await mongo.connect(settings)
    embedder = Embedder(settings.embedding_model)
    service = SearchService(mongo.db, embedder, AtlasVectorIndex(mongo.db))
    try:
        weights = [1.0, 0.6, 0.3, 0.15, 0.0] if sweep else [search_module.KEYWORD_WEIGHT_LONG]
        rows = []
        for w in weights:
            search_module.KEYWORD_WEIGHT_LONG = w
            hit1, hit3, mrr, misses = await run(service)
            rows.append((w, hit1, hit3, mrr))
            print(f"keyword weight (long queries) {w:.2f}: hit@1 {hit1:.0%}  hit@3 {hit3:.0%}  MRR {mrr:.3f}")
            if not sweep:
                print("\n".join(misses) or "  every case ranked first")
        report = Path(__file__).with_name("RESULTS.md")
        lines = [
            "# Search eval",
            "",
            f"{len(CASES)} queries against the curated library (`evals/search_eval.py`).",
            "",
        ]
        lines += ["| keyword weight (≥4-word queries) | hit@1 | hit@3 | MRR |", "|---|---|---|---|"]
        lines += [f"| {w:.2f} | {h1:.0%} | {h3:.0%} | {m:.3f} |" for w, h1, h3, m in rows]
        report.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"\nwrote {report.name}")
    finally:
        await mongo.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--sweep", action="store_true")
    asyncio.run(main(parser.parse_args().sweep))
