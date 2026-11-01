from pathlib import Path

import pytest

from app.ingest.gutenberg.parse import ParsedBook, parse_book

FIXTURE = Path(__file__).parents[1] / "fixtures" / "pg_sample.html"


@pytest.fixture(scope="module")
def book() -> ParsedBook:
    return parse_book(FIXTURE.read_text(encoding="utf-8"))


def test_metadata(book: ParsedBook) -> None:
    assert book.title == "The Lantern Keeper"
    assert book.subtitle == "A Tale of the Coast"
    assert book.rights == "Public domain in the USA."
    assert [(p.name, p.role, p.death) for p in book.people] == [
        ("Edith Mary Hale", "author", 1901),
        ("Constance Garnett", "translator", 1946),
    ]
    assert [p.name for p in book.authors] == ["Edith Mary Hale"]
    assert book.subjects == ["Lighthouses -- Fiction", "Sea stories"]


def test_chapters_fold_part_headings_and_skip_contents(book: ParsedBook) -> None:
    titles = [c.title for c in book.chapters]
    assert titles[0] == "Book One · Chapter I"
    assert "Contents" not in " ".join(titles)
    assert titles[1] == "Chapter II"


def test_short_epigraph_folds_into_the_next_chapter(book: ParsedBook) -> None:
    last = book.chapters[-1]
    assert last.title == "An Epigraph · Chapter the Last"
    assert last.paragraphs[0] == '"Every light is a promise."'


def test_print_artefacts_and_boilerplate_are_removed(book: ParsedBook) -> None:
    text = " ".join(p for c in book.chapters for p in c.paragraphs)
    assert "{2}" not in text  # page numbers
    assert "climbs the stair" not in text and "lighthouse at dusk" not in text  # captions
    assert "gutenberg" not in text.lower()
    assert "title page line" not in text  # front matter before the first chapter


def test_drop_cap_and_small_caps_are_restored(book: ParsedBook) -> None:
    assert book.chapters[0].paragraphs[0].startswith("The keeper climbed the hundred steps every evening")
    assert book.chapters[1].paragraphs[0].startswith("Mr. Ashdown came on a Tuesday")


def test_stanzas_keep_their_line_breaks(book: ParsedBook) -> None:
    assert (
        "The lamp is lit, the tide is low,\nAnd somewhere out the sailors go." in book.chapters[1].paragraphs
    )


def test_opening_is_a_clean_excerpt(book: ParsedBook) -> None:
    assert book.opening.startswith("The keeper climbed")
    assert len(book.opening) <= 330
    assert book.opening.endswith((".", "…"))


def test_word_and_byte_counts(book: ParsedBook) -> None:
    assert book.words == sum(c.words for c in book.chapters) > 100
    assert book.text_bytes > book.words


def test_books_without_headings_are_split_into_parts() -> None:
    para = "<p>" + " ".join(["word"] * 500) + "</p>"
    html = f'<html><head><meta name="dc.title" content="Flat"></head><body>{para * 20}</body></html>'
    parsed = parse_book(html)
    assert [c.title for c in parsed.chapters] == ["Part 1", "Part 2", "Part 3"]
    assert parsed.words == 10_000


def _book(body: str, title: str = "Sample", creator: str = "Doe, Jane, 1800-1880") -> ParsedBook:
    head = f'<meta name="dc.title" content="{title}"><meta name="dc.creator" content="{creator}">'
    words = " ".join(["story"] * 40)
    return parse_book(f"<html><head>{head}</head><body>{body.replace('WORDS', words)}</body></html>")


def test_contents_heading_never_swallows_chapter_one() -> None:
    # regression: "Contents" folded into "Chapter I" and the whole chapter was dropped as a TOC
    parsed = _book("<h2>Contents</h2><h2>Chapter I</h2><p>WORDS</p><h2>Chapter II</h2><p>WORDS</p>")
    assert [c.title for c in parsed.chapters] == ["Chapter I", "Chapter II"]


def test_title_page_headings_are_not_chapter_titles() -> None:
    body = (
        "<h2>by Jane Doe</h2><h2>[1867 Edition]</h2><h2>SAMPLE</h2><h2>CHAPTER I. THE START</h2><p>WORDS</p>"
    )
    parsed = _book(body + "<h2>II</h2><p>WORDS</p>")
    assert [c.title for c in parsed.chapters] == ["Chapter I. The Start", "Chapter II"]


def test_preformatted_verse_is_kept_line_by_line() -> None:
    verse = "<pre>\n  I heard that you ask'd\n  for something\n</pre>"
    parsed = _book(f"<h2>One</h2>{verse}<p>WORDS</p><h2>Two</h2><p>WORDS</p>")
    assert parsed.chapters[0].paragraphs[0] == "I heard that you ask'd\nfor something"


def test_title_entities_case_and_suffixes() -> None:
    assert _book("", title="The Odyssey&#10;Rendered into English prose").title == "The Odyssey"
    assert _book("", title="The war of the worlds").title == "The War of the Worlds"
    assert _book("", title="The Adventures of Tom Sawyer, Complete").title == "The Adventures of Tom Sawyer"
    carol = _book("", title="A Christmas Carol in Prose; Being a Ghost Story of Christmas")
    assert (carol.title, carol.subtitle) == ("A Christmas Carol in Prose", "Being a Ghost Story of Christmas")
