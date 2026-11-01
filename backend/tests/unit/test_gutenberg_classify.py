import pytest

from app.ingest.gutenberg.classify import (
    EMBLEM_BY_GENRE,
    SWATCH_RANGE,
    classify_genre,
    cover_for,
    reading_minutes,
    slugify,
)


@pytest.mark.parametrize(
    ("subjects", "genre"),
    [
        (["England -- Fiction", "Love stories", "Courtship -- Fiction"], "Romance"),
        (["Holmes, Sherlock (Fictitious character) -- Fiction", "Detective and mystery stories"], "Mystery"),
        (["Time travel -- Fiction", "Science fiction"], "Science Fiction"),
        (["Vampires -- Fiction", "Horror tales"], "Horror"),
        (["Treasure troves -- Fiction", "Pirates -- Fiction", "Adventure stories"], "Adventure"),
        (["Fantasy fiction", "Children's stories"], "Fantasy"),
        (["Stoics", "Ethics"], "Philosophy"),
        (["Russia -- Fiction", "Murder -- Fiction"], "Literary Fiction"),
        (["Political science -- Early works"], "Philosophy"),
        (["Lighthouses"], "Essays"),
        ([], "Literary Fiction"),
        # novels whose subjects mention non-fiction topics stay fiction
        (
            ["Didactic fiction", "Conduct of life -- Fiction", "Appearance (Philosophy) -- Fiction"],
            "Literary Fiction",
        ),
        (
            ["Puritans -- Fiction", "Illegitimate children -- Fiction", "Adultery -- Fiction"],
            "Literary Fiction",
        ),
        (["Boys -- Fiction", "Adventure stories"], "Adventure"),
    ],
)
def test_classify_genre(subjects: list[str], genre: str) -> None:
    assert classify_genre(subjects) == genre


def test_every_genre_has_an_emblem() -> None:
    assert "Literary Fiction" in EMBLEM_BY_GENRE and "Essays" in EMBLEM_BY_GENRE


def test_slugify() -> None:
    assert slugify("Alice's Adventures in Wonderland") == "alice-s-adventures-in-wonderland"
    assert slugify("Niccolò Machiavelli — Il Principe!") == "niccolo-machiavelli-il-principe"
    assert slugify("???") == "book"


def test_cover_is_deterministic_and_in_range() -> None:
    a, b = (
        cover_for("pride-and-prejudice", "Romance", 121_000),
        cover_for("pride-and-prejudice", "Romance", 121_000),
    )
    assert a == b
    assert a["emblem"] == "flame"
    assert 0 <= a["swatch"] < SWATCH_RANGE  # type: ignore[operator]
    assert a["pages"] == 403


def test_reading_minutes() -> None:
    assert reading_minutes(238) == 1
    assert reading_minutes(0) == 1
    assert reading_minutes(121_557) == 511
