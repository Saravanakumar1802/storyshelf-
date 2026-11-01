# Code overview

How StoryShelf fits together, for someone opening the code for the first time.

```
src/ (Next.js 16, static export)                    backend/ (FastAPI, Python 3.13)
  app/            routes (one folder per URL)         app/main.py      create_app(): middleware, routers, /mcp, lifespan
  components/     UI, by area (library, ai, admin…)   app/core/        config · errors · auth · rate limits · validators
  lib/api/        the only door to the API            app/db/          Mongo client · indexes · seed
  lib/store/      zustand (session, reading place)    app/modules/X/   router → service → (repository), schemas
  data/           static content + build snapshots    app/ai/          LLM gateway · embeddings · vectors · prompts
  theme/          every colour, font and 3D token     app/ingest/      Project Gutenberg → chapters
                                                      app/mcp/         the MCP server (personal access tokens)
                                                      app/scripts/     one-off jobs: ingest, embed, enrich, export
```

## A request, end to end

1. A component calls a function from `src/lib/api` (e.g. `semanticSearch(q)`).
2. `lib/api/http.ts` adds the bearer token, calls `NEXT_PUBLIC_API_URL/api/v1/...`, refreshes the session once on a 401, and turns the error envelope `{error: {code, message, fields}}` into an `ApiError`. Forms map `fields` straight onto inputs.
3. In FastAPI, the router validates the body (pydantic, camelCase on the wire), resolves `CurrentUser` / `AdminUser`, applies the route's rate limit, and calls a service.
4. The service does the work against MongoDB and, if needed, the AI layer. Any `AppError` it raises becomes the envelope with the right status.

## The library pipeline

| Step | Code | Notes |
|---|---|---|
| Fetch | `ingest/gutenberg/fetch.py` | a mirror, 2 s apart, cached on disk |
| Licence | `ingest/gutenberg/licence.py` | "Public domain in the USA" **and** every author dead 61+ years (India) |
| Parse | `ingest/gutenberg/parse.py` | chapters from PG HTML; boilerplate stripped |
| Store | `ingest/gutenberg/pipeline.py` | storage budget checked first; invisible until complete |
| Embed | `ai/chunking.py`, `ai/indexing.py` | ~1,200-char passages, bge-small (384-d, local CPU), Atlas vector indexes |
| Enrich | `modules/insights/service.py` | summary, hook, moods, themes (the `long` model chain) |
| Snapshot | `scripts/export_catalog.py` | `src/data/library.*.generated.json` → static book pages |

From the admin console the same steps run as one background job (`modules/admin/jobs.py`).

## The AI layer

- **Gateway** (`ai/llm/client.py`): LiteLLM calls, our own ordered failover over three chains (`fast`, `smart`, `long`, in `providers.py`), a circuit breaker per model (`health.py`), a response cache, a call log (`telemetry.py`) and each reader's daily allowance (`quota.py`). Every answer carries `AiMeta`, which the site shows as the ✨ chip.
- **No-key behaviour**: retrieval never spends quota. Search, similar books, recommendation ordering, Ask My Library's passages and the help bubble's FAQ answers all work with no LLM keys; only the written parts wait. `core/errors.ai_paused()` is the one check for "degrade gracefully".
- **Prompts** (`ai/prompts.py`): all in one place, versioned, with pydantic output schemas.

| Feature | Retrieval | Model |
|---|---|---|
| Search (`modules/search`) | passages + book vectors + keywords, weighted RRF | none |
| Mood picks (`modules/recommendations`) | mood text → book vectors, mood boost | `fast` reads the request, `smart` writes reasons |
| For me | taste vector from the shelves | `smart` writes reasons |
| Ask My Library (`modules/ask`) | 8 passages from the shelf's books | `fast` rewrites follow-ups, `smart` streams the cited answer (SSE) |
| Help bubble (`modules/assistant`) | FAQ vectors | `fast`, links from a fixed list |

## MCP

`app/mcp/server.py` registers tools that call the same services as the site, acting as the token's owner. `app/mcp/auth.py` guards `/mcp` (401 without a valid `ssk_` token, 120 calls/min). Readers create tokens at `/library/connect`.

## Publishing and support

- **Publish wizard → `POST /publish/requests`**: the quote is computed on the server (`modules/publishing/pricing.py`), and the first call is booked in the same diary as `/support/consultation` (`modules/support/consultations.py`; a unique index prevents double-booking).
- **Dashboard**: the author's newest open request shows its stage; admins move it along in `/admin` → Publishing.
- **Tickets**: private to their account and the admins; an admin's reply posts as the support team.

## Conventions

- **Theme**: colours, fonts and 3D tokens only in `src/theme`; components use `bg-surface`, `text-accent`, `var(--…)`.
- **Static first**: pages are statically exported for speed and SEO; anything per-user loads client-side after hydration (`useHydrated`). The full catalogue snapshot is imported only by server components.
- **Python**: ruff, strict mypy, pytest (unit: no network; integration: a throwaway database on the real cluster). `ApiModel` gives snake_case in Python and camelCase JSON.
- **Tests that matter**: the fallback chain (`tests/unit/test_llm_client.py`), licence rules, the parser on real PG HTML, prices kept in step with the site (`test_publishing_parts.py`), and every API flow in `tests/integration/`, including the MCP server driven by the official MCP client.

## Commands

```bash
# site
npm run dev | npm run lint | npx tsc --noEmit | npm run build:static
# api (in backend/)
python -m uv run pytest | python -m uv run ruff check . | python -m uv run mypy
python -m uv run python -m evals.search_eval | python -m uv run python -m evals.ask_eval
```
