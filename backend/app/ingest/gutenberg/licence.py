"""
Can we legally host this book? Two independent checks, both must pass:

1. The file's own rights statement (`<meta name="dc.rights">`) says
   "Public domain in the USA." Some Project Gutenberg books are still
   copyrighted and posted with permission, and that permission does not extend to us.
2. Every author, translator and editor died long enough ago for the work to
   be public domain in India too (life + 60 years, counted from 1 January after
   death). In 2026 that means they died in 1965 or earlier.
"""

import re
from dataclasses import dataclass
from datetime import date

INDIA_TERM_YEARS = 60
_PD_USA = "public domain in the usa"

# "Austen, Jane, 1775-1817"   "Plato, 428? BCE-348? BCE"   "Doyle, Arthur Conan, 1859-1930"
_YEARS = re.compile(
    r"(?P<birth>\d{1,4})?\??\s*(?P<bbce>BCE)?\s*-\s*(?P<death>\d{1,4})?\??\s*(?P<dbce>BCE)?\s*$"
)
_PARENS = re.compile(r"\s*\([^)]*\)")


class LicenceError(Exception):
    """The book can't be hosted; the message says why (shown to admins)."""


@dataclass(frozen=True)
class Person:
    name: str  # display form: "Jane Austen"
    role: str  # "author" | "translator" | "editor" | "contributor"
    birth: int | None  # negative = BCE
    death: int | None

    @property
    def years(self) -> str | None:
        def fmt(y: int | None) -> str:
            return "?" if y is None else (f"{-y} BCE" if y < 0 else str(y))

        return None if self.birth is None and self.death is None else f"{fmt(self.birth)}–{fmt(self.death)}"


def parse_person(raw: str, role: str = "author") -> Person:
    """Turns a catalogue name like "Shelley, Mary Wollstonecraft, 1797-1851" into a Person."""
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    birth = death = None
    if parts and (m := _YEARS.search(parts[-1])) and (m["birth"] or m["death"]):
        parts.pop()
        birth = int(m["birth"]) * (-1 if m["bbce"] else 1) if m["birth"] else None
        death = int(m["death"]) * (-1 if m["dbce"] else 1) if m["death"] else None
    parts = [_PARENS.sub("", p).strip() for p in parts]
    # "Marcus Aurelius, Emperor of Rome": the second part is an epithet, not a given name
    if len(parts) > 1 and " of " in parts[1]:
        parts = parts[:1]
    name = (
        f"{' '.join(parts[1:])} {parts[0]}".strip()
        if len(parts) > 1
        else (parts[0] if parts else "Anonymous")
    )
    return Person(name=name, role=role, birth=birth, death=death)


def latest_allowed_death_year(today: date | None = None) -> int:
    return (today or date.today()).year - INDIA_TERM_YEARS - 1


def check_licence(rights: str | None, people: list[Person], today: date | None = None) -> None:
    if not rights or not rights.strip().lower().startswith(_PD_USA):
        raise LicenceError(f"Rights statement is {rights!r}, not 'Public domain in the USA.'")
    cutoff = latest_allowed_death_year(today)
    for person in people:
        if person.name.lower() in {"anonymous", "various", "unknown"}:
            continue
        if person.death is None:
            raise LicenceError(f"{person.role.title()} {person.name} has no recorded death year")
        if person.death > cutoff:
            raise LicenceError(
                f"{person.role.title()} {person.name} died in {person.death}; "
                f"still in copyright in India (life + {INDIA_TERM_YEARS})"
            )
