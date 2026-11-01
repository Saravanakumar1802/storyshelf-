"""
The library as an MCP server, so a reader's own AI assistant (Claude Desktop,
Claude Code, Cursor…) can search, read, recommend and ask on their behalf.

Mounted at /mcp (Streamable HTTP, stateless JSON responses, so it runs behind
any plain HTTP host). Every call carries the reader's personal access token
and acts as that reader: their shelves, their quota, their role. The tools are
thin: each one calls the same service the website uses, so the assistant and
the site always agree.
"""

from collections.abc import Awaitable
from typing import Any, Literal

from fastapi import FastAPI
from mcp.server.mcpserver import Context, MCPServer
from mcp.server.mcpserver.exceptions import ResourceNotFoundError, ToolError
from mcp.server.transport_security import TransportSecuritySettings
from mcp_types import ToolAnnotations
from starlette.types import ASGIApp

from app.ai.prompts import Mood
from app.core.errors import AppError
from app.db.mongo import mongo
from app.mcp.auth import TokenGuard, TokenResolver, bearer
from app.modules.admin.jobs import ImportQueue
from app.modules.ask.schemas import QuestionIn, ThreadIn
from app.modules.ask.service import AskService
from app.modules.books.schemas import BookSummary
from app.modules.books.service import BooksService
from app.modules.insights.service import chapter_summary
from app.modules.recommendations.schemas import MoodIn, Recommendation
from app.modules.recommendations.service import RecommendationService
from app.modules.search.service import SearchService
from app.modules.shelf.schemas import ShelfStatus
from app.modules.shelf.service import ShelfService
from app.modules.users.schemas import UserPublic

INSTRUCTIONS = """\
StoryShelf is a free library of public-domain classics. These tools act as the
signed-in reader. Use search_books to find books by title, author or by a
description of a plot or feeling; get_book and read_chapter to read; the
recommend tools for suggestions; ask_my_library to answer questions from the
reader's own books, with citations. Books are identified by their slug
(e.g. "frankenstein"); chapters are numbered from 0.
"""

CHAPTER_CHARS = 30_000  # one tool result; longer chapters are cut with a note
READ_ONLY = ToolAnnotations(readOnlyHint=True, openWorldHint=False)
WRITES = ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=True, openWorldHint=False)


def _book(b: BookSummary) -> dict[str, Any]:
    out: dict[str, Any] = {
        "slug": b.slug,
        "title": b.title,
        "author": b.author,
        "genre": b.genre,
        "reading_minutes": b.reading_minutes,
        "chapters": b.chapter_count,
    }
    if b.ai:
        out |= {"hook": b.ai.hook, "moods": b.ai.moods}
    return out


def _pick(r: Recommendation) -> dict[str, Any]:
    return {**_book(r.book), "why": r.reason, "because_you_read": r.because}


def build_mcp(app: FastAPI) -> tuple[MCPServer[Any], ASGIApp]:
    """The MCP server and its token-guarded ASGI app (mount it at /mcp)."""
    mcp: MCPServer[Any] = MCPServer(
        name="storyshelf-library",
        title="StoryShelf Library",
        instructions=INSTRUCTIONS,
        version=app.version,
    )
    resolver = TokenResolver()

    async def caller(ctx: Context) -> UserPublic:
        user = await resolver.user(bearer(ctx.headers))
        if user is None:
            raise ToolError("Your StoryShelf access token is missing or was revoked.")
        return user

    def search() -> SearchService:
        return SearchService(mongo.db, app.state.embedder, app.state.vectors)

    def recommender() -> RecommendationService:
        return RecommendationService(mongo.db, app.state.llm, app.state.embedder, app.state.vectors)

    async def run[T](call: Awaitable[T]) -> T:
        try:
            return await call
        except AppError as exc:  # the same friendly message the website shows
            raise ToolError(exc.message) from exc

    @mcp.tool(annotations=READ_ONLY)
    async def search_books(query: str, ctx: Context, genre: str | None = None) -> dict[str, Any]:
        """Find books by title, author, or a description of the plot, theme or feeling
        (e.g. "a lonely voyage up a river into madness"). Returns the best matches, each
        with the passage that matched when there is one."""
        await caller(ctx)
        found = await run(search().search(query[:200], genre=genre, limit=8))
        return {
            "results": [
                {
                    **_book(h.book),
                    "matched_passage": {
                        "chapter": h.passage.chapter,
                        "chapter_title": h.passage.chapter_title,
                        "text": h.passage.excerpt,
                    }
                    if h.passage
                    else None,
                }
                for h in found.items
            ]
        }

    @mcp.tool(annotations=READ_ONLY)
    async def get_book(slug: str, ctx: Context) -> dict[str, Any]:
        """A book's details: author, length, table of contents and, when written, the
        AI summary, themes and moods."""
        await caller(ctx)
        d = await run(BooksService(mongo.db).detail(slug))
        out = _book(d) | {
            "author_years": d.author_years,
            "subjects": d.subjects,
            "opening": d.opening,
            "contents": [{"chapter": t.index, "title": t.title, "words": t.words} for t in d.toc],
            "source": d.source.url,
        }
        if d.ai:
            out |= {
                "summary": d.ai.summary,
                "themes": d.ai.themes,
                "tone": d.ai.tone,
                "reading_level": d.ai.reading_level,
            }
        return out

    @mcp.tool(annotations=READ_ONLY)
    async def read_chapter(slug: str, chapter: int, ctx: Context) -> dict[str, Any]:
        """The full text of one chapter (numbered from 0). Very long chapters are cut,
        and the result says so."""
        await caller(ctx)
        c = await run(BooksService(mongo.db).chapter(slug, chapter))
        text = "\n\n".join(c.paragraphs)
        return {
            "book": c.book.title,
            "chapter": c.index,
            "title": c.title,
            "of": c.total,
            "text": text[:CHAPTER_CHARS],
            "truncated": len(text) > CHAPTER_CHARS,
        }

    @mcp.tool(annotations=READ_ONLY)
    async def recommend_by_mood(
        ctx: Context,
        moods: list[Mood] | None = None,
        request: str | None = None,
        max_minutes: int | None = None,
    ) -> dict[str, Any]:
        """Books for a mood. Give moods (cozy, dark, adventurous, hopeful, mind-bending,
        romantic, funny, thoughtful), a free-text request like "something short and spooky",
        or both; max_minutes caps the reading time."""
        user = await caller(ctx)
        body = MoodIn(
            moods=(moods or [])[:4], text=(request or None) and request[:200], max_minutes=max_minutes
        )
        recs = await run(recommender().by_mood(body, user.id))
        return {"understood_as": recs.interpreted.model_dump(), "picks": [_pick(r) for r in recs.items]}

    @mcp.tool(annotations=READ_ONLY)
    async def recommend_for_me(ctx: Context) -> dict[str, Any]:
        """Personal picks drawn from the reader's shelves ("because you read …")."""
        user = await caller(ctx)
        recs = await run(recommender().for_reader(user.id))
        return {"based_on": recs.basis, "picks": [_pick(r) for r in recs.items], "note": recs.note}

    @mcp.tool(annotations=READ_ONLY)
    async def list_my_shelf(ctx: Context) -> dict[str, Any]:
        """The reader's shelves: what they want to read, are reading (with their place)
        and have finished."""
        user = await caller(ctx)
        items = await run(ShelfService(mongo.db).list(user.id))
        return {
            "shelf": [
                {**_book(i.book), "status": i.status, "chapter": i.chapter, "progress": i.progress}
                for i in items
            ]
        }

    @mcp.tool(annotations=WRITES)
    async def add_to_shelf(slug: str, ctx: Context, status: ShelfStatus = "want") -> dict[str, Any]:
        """Put a book on one of the reader's shelves: "want" (to read), "reading" or "finished"."""
        user = await caller(ctx)
        item = await run(ShelfService(mongo.db).set_status(user.id, slug, status))
        return {"ok": True, "book": item.book.title, "status": item.status}

    @mcp.tool(annotations=READ_ONLY)
    async def summarize_chapter(slug: str, chapter: int, ctx: Context) -> dict[str, Any]:
        """An AI summary of one chapter (written once, then shared with every reader)."""
        user = await caller(ctx)
        ai = await run(chapter_summary(mongo.db, app.state.llm, slug, chapter, user.id))
        return {
            "summary": ai.summary,
            "key_moments": ai.key_moments,
            "characters": ai.characters,
            "model": ai.meta.model,
        }

    @mcp.tool(annotations=WRITES.model_copy(update={"idempotentHint": False}))
    async def ask_my_library(question: str, ctx: Context, book: str | None = None) -> dict[str, Any]:
        """Answer a question using only the reader's own books (or one book, by slug),
        with numbered citations to the passages used. Says so when the books don't
        contain the answer. The conversation also appears in Ask My Library on the site."""
        user = await caller(ctx)
        service = AskService(mongo.db, app.state.llm, app.state.embedder, app.state.vectors)
        scope: Literal["shelf", "book"] = "book" if book else "shelf"
        thread = await run(service.create_thread(user.id, ThreadIn(scope=scope, book=book)))
        prepared = await run(service.prepare(user.id, thread.id, QuestionIn(question=question[:500])))
        answer, sources, note, model = "", [], None, None
        async for event, data in service.answer(prepared):
            if event == "sources":
                sources = [
                    {
                        "n": s["n"],
                        "book": s["book"]["title"],
                        "chapter": s["chapter"],
                        "chapter_title": s["chapterTitle"],
                        "passage": s["excerpt"],
                    }
                    for s in data
                ]
            elif event == "token":
                answer += data
            elif event == "done":
                model = data["meta"]["model"]
            elif event == "error":
                note = data["message"]
        return {"answer": answer or None, "sources": sources, "model": model, "note": note}

    @mcp.tool(annotations=WRITES.model_copy(update={"idempotentHint": False, "openWorldHint": True}))
    async def import_gutenberg_book(gutenberg_id: int, ctx: Context) -> dict[str, Any]:
        """Admins only: start importing a Project Gutenberg book by its number. The
        licence is checked first (public domain in the USA and India). Returns the job;
        it takes a minute or two."""
        user = await caller(ctx)
        if user.role != "admin":
            raise ToolError("Only library admins can import books.")
        imports: ImportQueue = app.state.imports
        job = await run(imports.start(gutenberg_id, user.id))
        return job.model_dump(mode="json")

    @mcp.resource("book://{slug}", mime_type="text/markdown")
    async def book_resource(slug: str) -> str:
        """A book's overview as Markdown."""
        try:
            d = await BooksService(mongo.db).detail(slug)
        except AppError as exc:
            raise ResourceNotFoundError(exc.message) from exc
        lines = [
            f"# {d.title}",
            f"by {d.author}",
            "",
            f"{d.genre} · {d.reading_minutes} min · {d.chapter_count} chapters",
        ]
        if d.ai:
            lines += ["", d.ai.summary]
        lines += ["", "## Contents", *(f"{t.index}. {t.title}" for t in d.toc)]
        return "\n".join(lines)

    http_app = mcp.streamable_http_app(
        streamable_http_path="/mcp",
        stateless_http=True,
        json_response=True,
        # every request must carry a valid personal token, so DNS-rebinding
        # (which can't read tokens) has nothing to gain; the host is not pinned
        transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
    )
    return mcp, TokenGuard(http_app, resolver, lambda: app.state.limiter)
