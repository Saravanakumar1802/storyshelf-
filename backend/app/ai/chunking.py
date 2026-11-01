"""
Chapters -> retrieval passages.

A passage is a run of whole paragraphs of about 1,200 characters: big enough
to carry a scene, small enough that its vector stays about one thing.
Paragraphs are never split mid-sentence unless a single paragraph is itself
very long. Each passage repeats the previous one's last short paragraph, so a
moment that straddles a boundary is still found whole.
"""

from dataclasses import dataclass

TARGET_CHARS = 1_200
MAX_CHARS = 1_800
OVERLAP_MAX_CHARS = 350


@dataclass(frozen=True)
class Passage:
    chapter: int
    seq: int  # order within the book
    text: str


def _split_long(paragraph: str) -> list[str]:
    """A paragraph longer than MAX_CHARS is cut at sentence ends."""
    if len(paragraph) <= MAX_CHARS:
        return [paragraph]
    pieces, current = [], ""
    for sentence in paragraph.replace("? ", "?\0").replace("! ", "!\0").replace(". ", ".\0").split("\0"):
        if current and len(current) + len(sentence) > TARGET_CHARS:
            pieces.append(current.strip())
            current = ""
        current += sentence + " "
    if current.strip():
        pieces.append(current.strip())
    return pieces


def chunk_chapter(chapter: int, paragraphs: list[str], start_seq: int = 0) -> list[Passage]:
    units = [piece for p in paragraphs for piece in _split_long(p)]
    passages: list[Passage] = []
    current: list[str] = []
    size = 0
    for unit in units:
        if current and size + len(unit) > MAX_CHARS:
            passages.append(Passage(chapter, start_seq + len(passages), "\n".join(current)))
            tail = current[-1]
            current, size = ([tail], len(tail)) if len(tail) <= OVERLAP_MAX_CHARS else ([], 0)
        current.append(unit)
        size += len(unit)
        if size >= TARGET_CHARS:
            passages.append(Passage(chapter, start_seq + len(passages), "\n".join(current)))
            tail = current[-1]
            current, size = ([tail], len(tail)) if len(tail) <= OVERLAP_MAX_CHARS else ([], 0)
    # leftovers that are only the overlap paragraph are already in the last passage
    if current and not (passages and current == [passages[-1].text.split("\n")[-1]]):
        passages.append(Passage(chapter, start_seq + len(passages), "\n".join(current)))
    return passages
