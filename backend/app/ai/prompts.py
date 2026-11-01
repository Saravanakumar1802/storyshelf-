"""
Every prompt the library sends, in one place, versioned.

Bump a PROMPT_VERSION when its wording changes. It is part of the cache key
and is stored with each generated insight, so old answers can be found and
regenerated.
"""

from typing import Literal

from pydantic import BaseModel, Field, field_validator

# The fixed mood vocabulary: the mood picker, mood matching and these prompts all share it.
MOODS = (
    "cozy",
    "dark",
    "adventurous",
    "hopeful",
    "romantic",
    "mind-bending",
    "melancholic",
    "funny",
    "suspenseful",
    "reflective",
    "whimsical",
    "epic",
)
Mood = Literal[
    "cozy",
    "dark",
    "adventurous",
    "hopeful",
    "romantic",
    "mind-bending",
    "melancholic",
    "funny",
    "suspenseful",
    "reflective",
    "whimsical",
    "epic",
]

LIBRARIAN = (
    "You are the librarian of StoryShelf, a free online library of classic public-domain books. "
    "You write for readers deciding what to read next: warm, precise, never gushing. "
    "Base everything only on the text and details provided. Never reveal endings or major twists."
)


def _clip_list(values: list[str], limit: int) -> list[str]:
    seen: list[str] = []
    for v in values:
        v = " ".join(str(v).split()).strip(" .")
        if v and v.lower() not in (s.lower() for s in seen):
            seen.append(v)
    return seen[:limit]


# ── book insights ─────────────────────────────────────────────────────

BOOK_PROMPT_VERSION = 1


class BookInsightsOut(BaseModel):
    summary: str = Field(min_length=80, max_length=1200)
    hook: str = Field(min_length=10, max_length=200)
    themes: list[str] = Field(min_length=1)
    moods: list[Mood] = Field(min_length=1)
    tone: str = Field(min_length=3, max_length=80)
    reading_level: Literal["easy", "moderate", "challenging"]
    content_notes: list[str] = Field(default_factory=list)

    @field_validator("moods", mode="before")
    @classmethod
    def _known_moods(cls, value: object) -> object:
        # models sometimes add moods outside the vocabulary; keep the ones we can use
        if isinstance(value, list):
            return [m for m in (str(v).strip().lower() for v in value) if m in MOODS][:4]
        return value

    @field_validator("themes")
    @classmethod
    def _themes(cls, value: list[str]) -> list[str]:
        return _clip_list(value, 5)

    @field_validator("content_notes")
    @classmethod
    def _notes(cls, value: list[str]) -> list[str]:
        return _clip_list(value, 4)


def book_insights_messages(book: dict[str, object], sample: str) -> list[dict[str, str]]:
    subjects = "; ".join(str(s) for s in book.get("subjects", []))  # type: ignore[attr-defined]
    user = f"""Book: {book["title"]} by {book["author"]}
Genre on our shelf: {book["genre"]}
Catalogue subjects: {subjects or "none"}

Excerpts from the book (the opening and a passage from the middle):
<<<
{sample}
>>>

Reply with one JSON object with exactly these keys:
- "summary": 3-4 sentences on what the book is about and why it endures. No spoilers past the first third.
- "hook": one irresistible line (max 25 words) that would make someone open it tonight.
- "themes": 3-5 short themes, e.g. "ambition", "class and marriage".
- "moods": 2-4 moods, chosen only from: {", ".join(MOODS)}.
- "tone": a few words on the voice, e.g. "witty, ironic social comedy".
- "reading_level": "easy", "moderate" or "challenging" for a modern reader.
- "content_notes": 0-4 short notes a sensitive reader might want (violence, period racism, …), or [].
"""
    return [{"role": "system", "content": LIBRARIAN}, {"role": "user", "content": user}]


# ── chapter summaries ─────────────────────────────────────────────────

CHAPTER_PROMPT_VERSION = 1


class ChapterSummaryOut(BaseModel):
    summary: str = Field(min_length=60, max_length=1200)
    key_moments: list[str] = Field(min_length=1)
    characters: list[str] = Field(default_factory=list)

    @field_validator("key_moments")
    @classmethod
    def _moments(cls, value: list[str]) -> list[str]:
        return _clip_list(value, 4)

    @field_validator("characters")
    @classmethod
    def _characters(cls, value: list[str]) -> list[str]:
        return _clip_list(value, 6)


def chapter_summary_messages(
    book: dict[str, object], title: str, text: str, truncated: bool
) -> list[dict[str, str]]:
    note = "\n(The chapter is long; this is its first part.)" if truncated else ""
    user = f"""Book: {book["title"]} by {book["author"]}
Chapter: {title}{note}

<<<
{text}
>>>

Summarise this chapter for a reader who has just finished it, or wants a recap before continuing.
Reply with one JSON object with exactly these keys:
- "summary": 3-5 sentences on what happens in this chapter (spoilers within this chapter are fine).
- "key_moments": 2-4 short bullet phrases, in order.
- "characters": the characters who appear (names only), at most 6.
"""
    return [{"role": "system", "content": LIBRARIAN}, {"role": "user", "content": user}]


# ── mood search ───────────────────────────────────────────────────────

MOOD_PROMPT_VERSION = 1


class MoodQueryOut(BaseModel):
    moods: list[Mood] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)
    max_minutes: int | None = Field(default=None, ge=10, le=6000)
    search_text: str = Field(min_length=3, max_length=300)

    @field_validator("moods", mode="before")
    @classmethod
    def _known_moods(cls, value: object) -> object:
        if isinstance(value, list):
            return [m for m in (str(v).strip().lower() for v in value) if m in MOODS][:4]
        return value

    @field_validator("themes")
    @classmethod
    def _themes(cls, value: list[str]) -> list[str]:
        return _clip_list(value, 5)


def mood_query_messages(text: str) -> list[dict[str, str]]:
    user = f"""A reader describes what they feel like reading:
"{text}"

Turn it into a search. Reply with one JSON object with exactly these keys:
- "moods": 0-4 moods, only from: {", ".join(MOODS)}.
- "themes": 0-5 short themes or settings they asked for, e.g. "the sea", "friendship".
- "max_minutes": the longest reading time they'd accept, in minutes, if they implied one
  ("short", "one evening" ≈ 180), else null.
- "search_text": one sentence describing the ideal book, to match against book descriptions.
"""
    return [{"role": "system", "content": LIBRARIAN}, {"role": "user", "content": user}]


# ── recommendation reasons ────────────────────────────────────────────

PICKS_PROMPT_VERSION = 1


class Pick(BaseModel):
    slug: str
    reason: str = Field(min_length=10, max_length=300)


class PicksOut(BaseModel):
    picks: list[Pick] = Field(min_length=1)


def _catalogue(candidates: list[dict[str, str]]) -> str:
    return "\n".join(
        f'- slug "{c["slug"]}": {c["title"]} by {c["author"]} ({c["genre"]}). {c["about"]}'
        for c in candidates
    )


def picks_for_reader_messages(
    shelf: list[str], candidates: list[dict[str, str]], count: int
) -> list[dict[str, str]]:
    user = f"""This reader's shelf:
{chr(10).join("- " + s for s in shelf)}

Candidate books from our library (closest in spirit to their shelf):
{_catalogue(candidates)}

Choose the {count} candidates this reader would most enjoy next, best first. For each, write one sentence
(max 30 words) that connects it to a specific book on their shelf, e.g. "If you loved X's ..., ...".
Reply with one JSON object: {{"picks": [{{"slug": "...", "reason": "..."}}]}}. Use only the slugs listed.
"""
    return [{"role": "system", "content": LIBRARIAN}, {"role": "user", "content": user}]


def picks_for_mood_messages(request: str, candidates: list[dict[str, str]]) -> list[dict[str, str]]:
    user = f"""A reader asked for: "{request}"

These books from our library match best:
{_catalogue(candidates)}

For each book, write one sentence (max 25 words) on why it fits what they asked for.
Reply with one JSON object: {{"picks": [{{"slug": "...", "reason": "..."}}]}}, in the same order.
Use only the slugs listed.
"""
    return [{"role": "system", "content": LIBRARIAN}, {"role": "user", "content": user}]


# ── Ask My Library (RAG) ──────────────────────────────────────────────

ASK_PROMPT_VERSION = 1

ASK_SYSTEM = (
    LIBRARIAN
    + " In this conversation you answer questions about the reader's own books using ONLY the numbered "
    "excerpts provided with each question. Cite every claim with the excerpt number in square brackets, "
    "like [2]; cite several when they support it [1][3]. If the excerpts don't contain the answer, say so "
    "plainly and suggest what the reader could ask instead. Never use outside knowledge of these books and "
    "never invent quotes. Keep answers under 180 words unless the reader asks for more. Spoilers are fine "
    "only when the question asks about them."
)


class StandaloneQuestionOut(BaseModel):
    question: str = Field(min_length=3, max_length=400)


def standalone_question_messages(history: list[tuple[str, str]], question: str) -> list[dict[str, str]]:
    turns = "\n".join(f"{role}: {text[:400]}" for role, text in history)
    user = f"""Conversation so far:
{turns}

Follow-up: "{question}"

Rewrite the follow-up as one standalone question that makes sense without the conversation (resolve "he",
"that book", "it" and so on). Reply with one JSON object: {{"question": "..."}}"""
    return [{"role": "system", "content": LIBRARIAN}, {"role": "user", "content": user}]


def ask_messages(
    history: list[tuple[str, str]], question: str, excerpts: list[tuple[int, str, str]]
) -> list[dict[str, str]]:
    """excerpts: (number, "Title — Chapter", text)."""
    context = "\n\n".join(f"[{n}] {where}\n{text}" for n, where, text in excerpts) or "(no excerpts found)"
    messages = [{"role": "system", "content": ASK_SYSTEM}]
    for role, text in history:
        messages.append({"role": "user" if role == "reader" else "assistant", "content": text})
    prompt = f"Excerpts from my books:\n\n{context}\n\nMy question: {question}"
    messages.append({"role": "user", "content": prompt})
    return messages
