"""
Shelf placement and cover design for an imported book, derived only from its
metadata. It is deterministic, so re-importing a book always gives the same cover.
"""

import hashlib
import re
import unicodedata
from typing import Literal

Finish = Literal["cloth", "jacket", "paperback"]

# (genre, subject keywords) — first match wins, so the more specific genres come first
_GENRE_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("Science Fiction", ("science fiction", "time travel", "interplanetary", "martians")),
    ("Literary Fiction", ("psychological fiction", "didactic fiction", "philosophical fiction")),
    ("Mystery", ("detective", "mystery", "holmes, sherlock", "private investigators")),
    ("Horror", ("horror", "vampires", "ghost stories", "gothic", "monsters", "werewolves")),
    ("Fantasy", ("fantasy", "fairy tales", "fairies", "magic", "wizards")),
    (
        "Children's Classics",
        ("juvenile fiction", "children's stories", "children's literature", "children's poetry"),
    ),
    ("Adventure", ("adventure", "sea stories", "voyages", "pirates", "treasure", "survival", "explorers")),
    ("Poetry", ("poetry", "poems", "sonnets", "verse")),
    ("Drama", ("drama", "tragedies", "comedies", "plays")),
    ("Short Stories", ("short stories",)),
    ("Philosophy", ("philosophy", "ethics", "political science", "stoics", "metaphysics", "conduct of life")),
    ("Memoir", ("biography", "autobiography", "slaves' writings", "diaries")),
    ("Historical", ("historical fiction", "history --", "revolution, 1789")),
    ("Romance", ("love stories", "courtship", "romance")),
    ("Nature", ("nature", "natural history", "wilderness")),
    ("Essays", ("essays", "satire")),
]
# genres that describe non-fiction; a subject such as "Conduct of life -- Fiction" must not make a novel one
_NON_FICTION = frozenset({"Philosophy", "Memoir", "Nature", "Essays"})
_FICTION = re.compile(r"\bfiction\b|\bstories\b|\btales\b", re.I)

EMBLEM_BY_GENRE: dict[str, str] = {
    "Literary Fiction": "lamp",
    "Romance": "flame",
    "Mystery": "key",
    "Adventure": "compass",
    "Science Fiction": "circuit",
    "Fantasy": "tree",
    "Horror": "moth",
    "Poetry": "quill",
    "Drama": "quill",
    "Short Stories": "rain",
    "Historical": "waves",
    "Philosophy": "snowflake",
    "Children's Classics": "leaf",
    "Memoir": "quill",
    "Nature": "leaf",
    "Essays": "lamp",
}

# real-world trim sizes in mm, so the 3D books stay to scale
_TRIM: dict[Finish, tuple[int, int]] = {"cloth": (140, 216), "jacket": (152, 229), "paperback": (129, 198)}
_WORDS_PER_PAGE = 300
SWATCH_RANGE = 100  # the site maps this onto however many cover cloths its theme defines


def classify_genre(subjects: list[str]) -> str:
    lowered = [s.lower() for s in subjects]
    is_fiction = any(_FICTION.search(s) for s in lowered)
    for genre, keywords in _GENRE_RULES:
        if is_fiction and genre in _NON_FICTION:
            continue
        if any(k in s for s in lowered for k in keywords):
            return genre
    return "Literary Fiction" if is_fiction or not subjects else "Essays"


def slugify(text: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")[:80] or "book"


def _digest(seed: str) -> int:
    return int.from_bytes(hashlib.sha256(seed.encode()).digest()[:4], "big")


def cover_for(slug: str, genre: str, words: int) -> dict[str, object]:
    h = _digest(slug)
    finish: Finish = ("cloth", "cloth", "jacket", "paperback")[h % 4]
    width, height = _TRIM[finish]
    return {
        "emblem": EMBLEM_BY_GENRE.get(genre, "lamp"),
        "finish": finish,
        "swatch": (h >> 8) % SWATCH_RANGE,
        "trim": {"width": width, "height": height},
        "pages": max(24, round(words / _WORDS_PER_PAGE)),
    }


def reading_minutes(words: int, wpm: int = 238) -> int:
    return max(1, round(words / wpm))
