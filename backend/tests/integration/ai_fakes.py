"""
Deterministic stand-ins for the embedding model and the LLMs, shared by the AI integration tests.

- BagOfWordsEmbedder: texts that share words get similar vectors.
- ScriptedLlm: recognises each prompt the app sends and answers with valid JSON
  (picks echo back the slugs offered in the prompt), counting the calls.
"""

import hashlib
import json
import re
from collections.abc import AsyncIterator, Sequence
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import numpy as np

from app.ai.embeddings import DIMENSIONS, Vector, normalise

FIXTURE = (Path(__file__).parents[1] / "fixtures" / "pg_sample.html").read_text(encoding="utf-8")
LIGHTHOUSE = FIXTURE.replace("Lantern Keeper", "Lamp Watcher")
# a second, unrelated book made from the same fixture
DESERT = (
    FIXTURE.replace("The Lantern Keeper: A Tale of the Coast", "The Salt Caravan")
    .replace("Lighthouses -- Fiction", "Deserts -- Fiction")
    .replace("lighthouse", "caravanserai")
    .replace("keeper", "trader")
    .replace("sea", "dunes")
    .replace("ships", "camels")
    .replace("fog", "sandstorm")
    .replace("lamp", "fire")
)


class BagOfWordsEmbedder:
    def _vec(self, text: str) -> Vector:
        v = np.zeros(DIMENSIONS, dtype=np.float32)
        for w in re.findall(r"[a-z]{3,}", text.lower()):
            v[int(hashlib.md5(w.encode()).hexdigest(), 16) % DIMENSIONS] += 1.0
        return normalise(v)

    async def embed_passages(self, texts: Sequence[str]) -> list[Vector]:
        return [self._vec(t) for t in texts]

    async def embed_query(self, text: str) -> Vector:
        return self._vec(text)


BOOK_JSON = json.dumps(
    {
        "summary": "A lighthouse keeper and his daughter keep watch over a lonely coast while the world "
        "beyond the fog slowly changes around them.",
        "hook": "Every light is a promise, until the sea stops answering.",
        "themes": ["duty", "solitude", "change"],
        "moods": ["melancholic", "reflective", "not-a-mood"],
        "tone": "quiet, salt-worn",
        "reading_level": "easy",
        "content_notes": [],
    }
)
CHAPTER_JSON = json.dumps(
    {
        "summary": "The keeper climbs to the lamp at dusk as he has every night, and his daughter records "
        "the passing ships in the logbook.",
        "key_moments": ["The evening climb", "The logbook"],
        "characters": ["The keeper", "His daughter"],
    }
)
MOOD_JSON = json.dumps(
    {
        "moods": ["melancholic"],
        "themes": ["the sea"],
        "max_minutes": None,
        "search_text": "a lonely lighthouse by the sea",
    }
)


HELP_JSON = json.dumps(
    {"answer": "Pro pays quarterly; Kickstart and Level-Up pay annually.", "links": ["royalties", "nowhere"]}
)


class ScriptedLlm:
    def __init__(self) -> None:
        self.calls = 0
        self.standalone_calls = 0
        self.answer_stream: list[str] = ["The keeper ", "climbs the stair ", "every evening [1]."]

    def _answer(self, prompt: str) -> str:
        if "Summarise this chapter" in prompt:
            return CHAPTER_JSON
        if "Turn it into a search" in prompt:
            return MOOD_JSON
        if "Rewrite the follow-up" in prompt:
            self.standalone_calls += 1
            return json.dumps({"question": "What does the lighthouse keeper do every evening?"})
        if '"picks"' in prompt:
            slugs = re.findall(r'slug "([^"]+)"', prompt)
            return json.dumps(
                {"picks": [{"slug": s, "reason": f"Because it suits you well: {s}."} for s in slugs]}
            )
        return BOOK_JSON

    async def __call__(self, **kw: Any) -> Any:
        self.calls += 1
        if kw.get("stream"):
            return self._stream()
        if "author-support assistant" in kw["messages"][0]["content"]:
            text = HELP_JSON
        else:
            text = self._answer(kw["messages"][-1]["content"])
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=text))], usage=None)

    async def _stream(self) -> AsyncIterator[Any]:
        for part in self.answer_stream:
            yield SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content=part))])
