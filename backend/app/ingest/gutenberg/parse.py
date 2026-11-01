"""
Project Gutenberg HTML -> clean chapters of plain-text paragraphs.

The generated HTML (`pg<id>-images.html`) is consistent at the edges, with the
licence header and footer in #pg-header / #pg-footer and metadata in
<meta name="dc.*">, but each book's body is hand-made. So the parser:

- strips the PG boilerplate and every remaining reference to PG (the licence
  allows this, and it lets us host the plain public-domain text);
- drops print artefacts: page numbers, figure captions, tables of contents;
- keeps drop-cap letters that are drawn as images, using their alt text;
- treats every h2/h3 as a chapter boundary, folding headings that are
  immediately followed by another heading ("BOOK I" then "CHAPTER 1") into
  one title;
- splits a book with no usable headings into parts of about 4,000 words.
"""

import html
import re
from dataclasses import dataclass, field

from selectolax.lexbor import LexborHTMLParser, LexborNode

from app.ingest.gutenberg.licence import Person, parse_person

_DROP = (
    "#pg-header, #pg-footer, .pg-boilerplate, .pagenum, .caption, .figcenter, .figleft, .figright,"
    " figure, .toc, table, script, style, .footnotes"
)
# verse arrives either as styled stanzas or as preformatted blocks (e.g. Leaves of Grass)
_BLOCKS = "h1, h2, h3, p, div.stanza, pre"
_VERSE_TAGS = ("div", "pre")
_SKIP_TITLES = re.compile(
    r"^(contents|table of contents|list of illustrations|illustrations|index|footnotes|transcriber.?s note)",
    re.I,
)
_ROMAN = re.compile(r"^[IVXLCDM]+\.?$")
_BARE_NUMBER = re.compile(r"^(?:[IVXLCDM]+|\d+)$")
_BRACKETED = re.compile(r"^[\[(].*[\])]$")
_STRICT_ROMAN = re.compile(r"^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$")
_WORD = re.compile(r"[A-Za-z][A-Za-z'’]*")
_TITLE_SUFFIX = re.compile(r",?\s*(complete|unabridged)\.?$", re.I)
# words a title keeps in lower case unless they open or close it
_MINOR_WORDS = frozenset(
    {"a", "an", "the", "and", "or", "nor", "but", "of", "in", "on", "at", "to", "for", "with", "by", "from"}
    | {"into", "upon", "under", "as", "vs", "via"}
)
_SMALL_CAPS_OPENING = re.compile(r"^((?:[A-Z][A-Z'’.\-]+\s+)+)(?=[a-z])")
_MARCREL_ROLES = {"marcrel.trl": "translator", "marcrel.edt": "editor", "marcrel.ctb": "contributor"}
_MIN_CHAPTER_WORDS = 30
_FALLBACK_PART_WORDS = 4000
_OPENING_CHARS = 320


@dataclass
class Chapter:
    title: str
    paragraphs: list[str] = field(default_factory=list)

    @property
    def words(self) -> int:
        return sum(len(p.split()) for p in self.paragraphs)


@dataclass
class ParsedBook:
    title: str
    subtitle: str | None
    people: list[Person]
    subjects: list[str]
    language: str
    rights: str | None
    chapters: list[Chapter]

    @property
    def authors(self) -> list[Person]:
        return [p for p in self.people if p.role == "author"] or self.people[:1]

    @property
    def words(self) -> int:
        return sum(c.words for c in self.chapters)

    @property
    def text_bytes(self) -> int:
        return sum(len(p.encode()) for c in self.chapters for p in c.paragraphs)

    @property
    def opening(self) -> str:
        """The first lines of the story, cut at a sentence end: a real taste of the book."""
        text = ""
        for p in self.chapters[0].paragraphs if self.chapters else []:
            text = f"{text} {p}".strip()
            if len(text) >= _OPENING_CHARS:
                break
        if len(text) <= _OPENING_CHARS:
            return text
        cut = max(text.rfind(m, 0, _OPENING_CHARS) for m in (". ", "! ", "? ", "” "))
        return text[: cut + 1] if cut > 80 else text[:_OPENING_CHARS].rsplit(" ", 1)[0] + "…"


def _clean(text: str) -> str:
    return " ".join(text.split())


def _soften_small_caps(text: str) -> str:
    """Chapters often open in printed small caps: "MR. BENNET was among…" -> "Mr. Bennet was among…"."""
    m = _SMALL_CAPS_OPENING.match(text)
    if not m:
        return text
    return " ".join(w.capitalize() for w in m.group(1).split()) + " " + text[m.end() :]


def _soften_word(m: re.Match[str]) -> str:
    word = m.group(0)
    if len(word) < 2 or not word.isupper() or _STRICT_ROMAN.match(word):
        return word
    return word.capitalize()


def _smart_title(text: str) -> str:
    """ "CHAPTER II. Down the Rabbit-Hole" -> "Chapter II. Down the Rabbit-Hole"; "IV" -> "Chapter IV"."""
    text = _clean(text).rstrip(".").strip()
    if _BARE_NUMBER.match(text):
        return f"Chapter {text}"
    return _WORD.sub(_soften_word, text)


def _title_case(title: str) -> str:
    """Catalogue titles are often sentence case: "The war of the worlds" -> "The War of the Worlds"."""
    words = title.split()
    if not any(w[0].islower() and w.lower() not in _MINOR_WORDS for w in words):
        return title  # already title case (or deliberately styled)
    out = []
    for i, w in enumerate(words):
        lower = w.lower()
        if 0 < i < len(words) - 1 and lower in _MINOR_WORDS:
            out.append(lower)
        elif w[0].islower():
            out.append(w[0].upper() + w[1:])
        else:
            out.append(w)  # keep "Dr.", "McTeague", "O'Neill" as written
    return " ".join(out)


def _meta(tree: LexborHTMLParser, name: str) -> list[str]:
    # content attributes can carry entities such as "&#10;" (a line break inside the title)
    nodes = tree.css(f'meta[name="{name}"]')
    return [c for n in nodes if (c := html.unescape(n.attributes.get("content") or "").strip())]


def _split_title(raw: str) -> tuple[str, str | None]:
    raw = raw.strip()
    title, subtitle = _clean(raw), None
    for sep in ("\n", ": ", "; or, ", "; Or, ", "; "):
        if sep in raw:
            head, tail = raw.split(sep, 1)
            title, subtitle = _clean(head), _clean(tail) or None
            break
    title = _TITLE_SUFFIX.sub("", title).strip()
    return _title_case(title), subtitle


def _block_text(node: LexborNode) -> str:
    # inline pieces join without a separator, so a drop cap ("<span>I</span>T is") stays one word
    text = node.text(separator="")
    if node.tag in _VERSE_TAGS:  # verse: keep its line breaks
        lines = [_clean(line) for line in text.split("\n")]
        return "\n".join(line for line in lines if line)
    return _clean(text)


def _prepare(tree: LexborHTMLParser) -> None:
    for node in tree.css(_DROP):
        node.decompose()
    for img in tree.css("img"):
        alt = (img.attributes.get("alt") or "").strip()
        # drop caps are drawn as images whose alt is the missing letter ("W" + "HEN Jane…")
        if 0 < len(alt) <= 2:
            img.replace_with(alt)
        else:
            img.decompose()
    for br in tree.css("br"):
        br.replace_with("\n")


def _chapters(tree: LexborHTMLParser, book_names: str) -> list[Chapter]:
    chapters: list[Chapter] = []
    current: Chapter | None = None
    pending: list[str] = []  # headings waiting for their first paragraph
    in_contents = False  # inside a "Contents" / "Illustrations" section, whose lines are not story
    for node in tree.css(_BLOCKS):
        text = _block_text(node)
        if not text:
            continue
        if node.tag == "h1":
            continue  # the book title; already in metadata
        if node.tag in ("h2", "h3"):
            heading = _smart_title(text)
            in_contents = bool(_SKIP_TITLES.match(heading))
            if not in_contents and not _is_title_page_heading(heading, book_names):
                pending.append(heading)
            continue
        if in_contents or "gutenberg" in text.lower():
            continue
        if pending:
            # keep the two most specific headings: "Book One · Chapter I", not the whole title page
            current = Chapter(title=" · ".join(pending[-2:]))
            chapters.append(current)
            pending = []
            text = _soften_small_caps(text)
        if current is not None:
            current.paragraphs.append(text)
    return chapters


def _letters(text: str) -> str:
    return re.sub(r"[^a-z]", "", text.lower())


def _is_title_page_heading(heading: str, book_names: str) -> bool:
    """Title-page lines set as headings: "by Lewis Carroll", "D R A C U L A", "Translated by …"."""
    lowered = heading.lower()
    if lowered.startswith(("by ", "translated by", "edited by", "illustrated by", "with illustrations")):
        return True
    if _BRACKETED.match(heading):  # "[1867 Edition]", "(1811)"
        return True
    letters = _letters(heading)
    return len(letters) >= 4 and letters in book_names


def _merge_short(chapters: list[Chapter]) -> list[Chapter]:
    """Epigraphs and part-title pages fold into the chapter that follows them."""
    merged: list[Chapter] = []
    carry: Chapter | None = None
    for ch in chapters:
        if carry is not None:
            ch = Chapter(title=f"{carry.title} · {ch.title}", paragraphs=carry.paragraphs + ch.paragraphs)
            carry = None
        if ch.words < _MIN_CHAPTER_WORDS:
            carry = ch
        else:
            merged.append(ch)
    if carry is not None and merged:
        merged[-1].paragraphs.extend(carry.paragraphs)
    return merged


def _split_into_parts(paragraphs: list[str]) -> list[Chapter]:
    parts: list[Chapter] = []
    current = Chapter(title="Part 1")
    for p in paragraphs:
        current.paragraphs.append(p)
        if current.words >= _FALLBACK_PART_WORDS:
            parts.append(current)
            current = Chapter(title=f"Part {len(parts) + 1}")
    if current.paragraphs:
        parts.append(current)
    return parts


def parse_book(html: str) -> ParsedBook:
    tree = LexborHTMLParser(html)
    title_raw = (_meta(tree, "dc.title") or [""])[0]
    title, subtitle = _split_title(title_raw)
    people = [parse_person(c, "author") for c in _meta(tree, "dc.creator")]
    for meta_name, role in _MARCREL_ROLES.items():
        people += [parse_person(c, role) for c in _meta(tree, meta_name)]
    rights = next(iter(_meta(tree, "dc.rights")), None)
    language = (_meta(tree, "dc.language") or ["en"])[0]
    subjects = _meta(tree, "dc.subject")

    _prepare(tree)
    # headings that merely repeat the title page (title, subtitle, author) are not chapters
    book_names = _letters(" ".join([title_raw, subtitle or "", *(p.name for p in people)]))
    chapters = _merge_short(_chapters(tree, book_names))
    if len(chapters) < 2:
        body = tree.body
        paragraphs = (
            [] if body is None else [t for n in body.css("p, div.stanza, pre") if (t := _block_text(n))]
        )
        chapters = _split_into_parts([p for p in paragraphs if "gutenberg" not in p.lower()])
    return ParsedBook(
        title=title or "Untitled",
        subtitle=subtitle,
        people=people,
        subjects=subjects,
        language=language,
        rights=rights,
        chapters=chapters,
    )
