from itertools import pairwise

from bson import ObjectId

from app.ai.chunking import MAX_CHARS, chunk_chapter
from app.ai.vector_store import Hit
from app.modules.search.service import excerpt, fuse


def test_chunks_are_whole_paragraphs_with_a_short_overlap() -> None:
    paragraphs = [f"Paragraph {i}. " + "word " * 60 for i in range(12)]  # ~315 chars each
    passages = chunk_chapter(3, paragraphs, start_seq=10)
    assert [p.seq for p in passages] == list(range(10, 10 + len(passages)))
    assert all(p.chapter == 3 and len(p.text) <= MAX_CHARS for p in passages)
    # each passage starts with the previous passage's last paragraph
    for a, b in pairwise(passages):
        assert b.text.split("\n")[0] == a.text.split("\n")[-1]
    # nothing is lost
    joined = "\n".join(p.text for p in passages)
    assert all(p in joined for p in paragraphs)


def test_a_giant_paragraph_is_split_at_sentence_ends() -> None:
    giant = " ".join(f"Sentence number {i} is here." for i in range(200))
    passages = chunk_chapter(0, [giant])
    assert len(passages) > 1
    assert all(len(p.text) <= MAX_CHARS for p in passages)
    assert all(p.text.rstrip().endswith(".") for p in passages)


def test_short_chapter_is_one_passage() -> None:
    assert [p.text for p in chunk_chapter(0, ["A short ending."])] == ["A short ending."]


def test_rrf_rewards_books_found_by_several_signals() -> None:
    a, b, c = ObjectId(), ObjectId(), ObjectId()
    passages = [
        Hit({"book_id": b, "chapter": 4, "text": "best b passage"}, 0.9),
        Hit({"book_id": b, "chapter": 9, "text": "second b passage"}, 0.85),  # ignored: one per book
        Hit({"book_id": a, "chapter": 1, "text": "a passage"}, 0.8),
    ]
    books = [Hit({"_id": a}, 0.7), Hit({"_id": c}, 0.6)]
    keywords = [{"_id": a}]
    found = fuse(passages, books, keywords)
    assert set(found) == {a, b, c}
    assert found[a].matched_by == ["passage", "meaning", "keyword"]
    assert max(found, key=lambda k: found[k].score) == a  # three signals beat one strong one
    assert found[b].passage is not None and found[b].passage["chapter"] == 4
    assert found[c].passage is None


def test_excerpt_cuts_at_a_sentence_when_it_can() -> None:
    text = "First sentence is here. " * 20
    out = excerpt(text, 100)
    assert len(out) <= 100 and out.endswith(".")
    assert excerpt("short   text\nhere") == "short text here"
