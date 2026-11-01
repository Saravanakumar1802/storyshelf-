"""
Application factory. Run locally with:

    python -m uv run uvicorn app.main:app --reload
"""

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.routing import Route

from app.ai.embeddings import Embedder
from app.ai.llm.client import build_llm
from app.ai.vector_store import AtlasVectorIndex
from app.core.config import Settings, get_settings
from app.core.errors import register_error_handlers
from app.core.logging import RequestContextMiddleware, configure_logging
from app.core.rate_limit import RateLimiter
from app.core.security_headers import SecurityHeadersMiddleware
from app.db.indexes import ensure_indexes
from app.db.mongo import mongo
from app.db.seed import seed_accounts
from app.mcp.server import build_mcp
from app.modules.admin.jobs import ImportQueue
from app.modules.admin.router import router as admin_router
from app.modules.ai_status.router import router as ai_status_router
from app.modules.ask.router import router as ask_router
from app.modules.assistant.router import router as assistant_router
from app.modules.auth.router import router as auth_router
from app.modules.books.router import router as books_router
from app.modules.health.router import router as health_router
from app.modules.insights.router import router as insights_router
from app.modules.publishing.router import router as publishing_router
from app.modules.recommendations.router import router as recommendations_router
from app.modules.search.router import router as search_router
from app.modules.shelf.router import router as shelf_router
from app.modules.support.router import router as support_router
from app.modules.tokens.router import router as tokens_router

API_PREFIX = "/api/v1"
MCP_PATH = "/mcp"
_MIN_SECRET_LEN = 32


async def _startup(settings: Settings) -> None:
    if len(settings.jwt_secret.get_secret_value()) < _MIN_SECRET_LEN:
        raise RuntimeError(
            f"JWT_SECRET must be at least {_MIN_SECRET_LEN} characters (see backend/.env.example)"
        )
    await mongo.connect(settings)
    await ensure_indexes(mongo.db)
    await seed_accounts(mongo.db, settings)


def create_app(settings: Settings | None = None, *, connect_db: bool = True) -> FastAPI:
    settings = settings or get_settings()
    configure_logging()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        if connect_db:
            await _startup(settings)
            app.state.llm = build_llm(settings, mongo.db)
            app.state.vectors = AtlasVectorIndex(mongo.db)
            app.state.imports = ImportQueue(mongo.db, settings, app.state.llm, app.state.embedder)
            await app.state.imports.recover()
            # loading the embedding model takes seconds: do it in the background so startup stays fast
            warm = asyncio.create_task(app.state.embedder.warm_up())
        try:
            async with mcp.session_manager.run():
                yield
        finally:
            if connect_db:
                warm.cancel()
                if (calls := app.state.llm._log) is not None:
                    await calls.flush()  # don't lose the last few AI call records
                await mongo.close()

    app = FastAPI(
        title="StoryShelf AI Library API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/docs",
    )
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(SecurityHeadersMiddleware, production=settings.is_production)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,  # auth travels in the Authorization header, not cookies
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )
    register_error_handlers(app)
    # routes read the settings this app was built with (tests build theirs)
    app.dependency_overrides[get_settings] = lambda: settings
    app.state.limiter = RateLimiter(enabled=settings.rate_limits, trust_proxy=settings.trust_proxy_headers)
    # replaced in the lifespan once the database (for AI logging and caching) is connected
    app.state.llm = build_llm(settings, None)
    app.state.embedder = Embedder(settings.embedding_model)

    app.include_router(health_router, prefix=API_PREFIX)
    app.include_router(auth_router, prefix=API_PREFIX)
    app.include_router(books_router, prefix=API_PREFIX)
    app.include_router(ai_status_router, prefix=API_PREFIX)
    app.include_router(search_router, prefix=API_PREFIX)
    app.include_router(insights_router, prefix=API_PREFIX)
    app.include_router(shelf_router, prefix=API_PREFIX)
    app.include_router(recommendations_router, prefix=API_PREFIX)
    app.include_router(ask_router, prefix=API_PREFIX)
    app.include_router(tokens_router, prefix=API_PREFIX)
    app.include_router(admin_router, prefix=API_PREFIX)
    app.include_router(support_router, prefix=API_PREFIX)
    app.include_router(publishing_router, prefix=API_PREFIX)
    app.include_router(assistant_router, prefix=API_PREFIX)

    # the MCP server for readers' own AI assistants (see app/mcp/server.py)
    mcp, mcp_app = build_mcp(app)
    app.state.mcp = mcp
    app.router.routes.append(Route(MCP_PATH, endpoint=mcp_app, methods=["GET", "POST", "DELETE"]))
    return app


app = create_app()
