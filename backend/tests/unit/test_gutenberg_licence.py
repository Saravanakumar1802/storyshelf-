from datetime import date

import pytest

from app.ingest.gutenberg.licence import LicenceError, Person, check_licence, parse_person

TODAY = date(2026, 10, 31)


@pytest.mark.parametrize(
    ("raw", "name", "birth", "death", "years"),
    [
        ("Austen, Jane, 1775-1817", "Jane Austen", 1775, 1817, "1775–1817"),
        ("Shelley, Mary Wollstonecraft, 1797-1851", "Mary Wollstonecraft Shelley", 1797, 1851, "1797–1851"),
        ("Plato, 428? BCE-348? BCE", "Plato", -428, -348, "428 BCE–348 BCE"),
        ("Kennedy, John F. (John Fitzgerald), 1917-1963", "John F. Kennedy", 1917, 1963, "1917–1963"),
        ("Homer, -750?", "Homer", None, 750, "?–750"),
        ("Marcus Aurelius, Emperor of Rome, 121-180", "Marcus Aurelius", 121, 180, "121–180"),
        ("Anonymous", "Anonymous", None, None, None),
    ],
)
def test_parse_person(raw: str, name: str, birth: int | None, death: int | None, years: str | None) -> None:
    p = parse_person(raw)
    assert (p.name, p.birth, p.death, p.years) == (name, birth, death, years)


def _people(*deaths: int | None) -> list[Person]:
    return [Person(name=f"P{i}", role="author", birth=None, death=d) for i, d in enumerate(deaths)]


def test_public_domain_book_by_long_dead_authors_passes() -> None:
    check_licence("Public domain in the USA.", _people(1817, 1946, -348), TODAY)


def test_copyrighted_rights_statement_is_rejected() -> None:
    with pytest.raises(LicenceError, match="Rights statement"):
        check_licence(
            "Copyrighted. Read the copyright notice inside this book for details.", _people(1900), TODAY
        )
    with pytest.raises(LicenceError):
        check_licence(None, _people(1900), TODAY)


def test_india_life_plus_sixty_cutoff() -> None:
    check_licence("Public domain in the USA.", _people(1965), TODAY)  # expired on 1 Jan 2026
    with pytest.raises(LicenceError, match="died in 1966"):
        check_licence("Public domain in the USA.", _people(1966), TODAY)


def test_unknown_death_year_is_rejected_unless_anonymous() -> None:
    with pytest.raises(LicenceError, match="no recorded death year"):
        check_licence("Public domain in the USA.", _people(None), TODAY)
    anon = [Person(name="Anonymous", role="author", birth=None, death=None)]
    check_licence("Public domain in the USA.", anon, TODAY)
