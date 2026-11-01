# StoryShelf — AI Library API

A FastAPI backend for the StoryShelf site. It provides auth, the book catalogue and reader, and AI features: semantic search, recommendations, Ask My Library (RAG) and summaries. The LLMs run on free tiers with automatic fallback, and an MCP server exposes the library to AI agents.

## Run it

```bash
cd backend
python -m pip install --user uv          # once
python -m uv sync                        # creates .venv with locked deps
cp .env.example .env                     # then fill in MONGODB_URI, JWT_SECRET, …
python -m uv run uvicorn app.main:app --reload --port 8000
```

- Interactive docs: http://localhost:8000/docs
- Health and storage: http://localhost:8000/api/v1/health

The Next.js site reads the API URL from `NEXT_PUBLIC_API_URL` in the repo's `.env.local`.

## Quality gates

```bash
python -m uv run pytest            # unit + integration (integration uses <MONGODB_DB>_test on your cluster)
python -m uv run ruff check . && python -m uv run ruff format --check .
python -m uv run mypy              # strict
```

## Layout

```
app/
  main.py          create_app(): lifespan (connect, indexes, seed), middleware, routers
  core/            config · errors (one JSON error envelope) · security (Argon2, JWT) · auth deps · logging
  db/              mongo client · indexes · seed accounts
  modules/<area>/  router.py → service.py → repository.py, with schemas.py for request/response models
tests/
  unit/            no network
  integration/     real Atlas, throwaway database
```

## Auth in one paragraph

- **Sign-in and sign-up** return a 30-minute JWT access token, a 14-day refresh token and the user.
- **Refresh tokens are opaque.** Only their SHA-256 is stored, and they **rotate** on every refresh.
- **Reuse is treated as theft.** Presenting a retired refresh token revokes its whole family.
- **Roles** are `reader`, `author` and `admin`. Admin is only seeded from `.env`; nobody can sign up as admin.
- **Demo author:** `demo@storyshelf.in` / `publish123`, seeded on start.

## The AI layer in one paragraph

- **Gateway:** LiteLLM is the gateway; `litellm.acompletion` speaks to every provider.
- **Failover:** `app/ai/llm/client.py` adds an ordered failover policy over three task chains, `fast`, `smart` and `long` (see `providers.py`).
- **Circuit breaker:** each model has one (`health.py`). A rate limit rests it for a minute, or for as long as its Retry-After header says. A bad key rests it for an hour, and an outage for 30 s.
- **What each answer reports:** every answer returns `AiMeta`: provider, model, latency, cache hit, and the trail of models that were resting or failed first.
- **Logging:** every attempt is logged to `ai_calls`, without prompts or answers, for 14 days. That log feeds the public `GET /api/v1/ai/status`.
- **Caching:** deterministic answers are cached in `ai_cache`.
- **No keys:** missing keys simply drop a provider from the chains, and with no keys at all the AI features answer `503 AI_UNAVAILABLE`.

```bash
python -m uv run python -m app.scripts.check_models   # ping each configured model after editing .env
```

## Library AI: search, recommendations, Ask My Library

```bash
python -m uv run python -m app.scripts.embed_library   # passages + book vectors (local CPU) + Atlas vector indexes
python -m uv run python -m app.scripts.enrich_books    # AI summaries, hooks, moods (needs an LLM key)
python -m uv run python -m app.scripts.export_catalog  # refresh the site snapshot (incl. "similar in spirit")
python -m uv run python -m evals.search_eval           # search relevance: hit@1, hit@3, MRR -> evals/RESULTS.md
```

| Endpoint | What it does | Needs an LLM? |
|---|---|---|
| `GET /search?q=` | hybrid search: passages + book meaning + keywords, fused with RRF | no |
| `GET /books/{slug}/similar` | nearest books by vector | no |
| `POST /books/{slug}/chapters/{n}/summary` | chapter summary, generated once and stored | yes |
| `GET/PUT/DELETE /library/shelf/{slug}`, `PUT /library/progress/{slug}` | My Library shelves and reading position | no |
| `GET /recommendations/for-me` | "because you read…" from the shelf taste vector | reasons only |
| `POST /recommendations/mood` | moods or a described feeling -> books | parsing and reasons only |
| `POST /ask/threads`, `POST /ask/threads/{id}/messages` | Ask My Library: grounded, cited answers streamed as SSE | the answer only (sources always) |

## MCP server (readers' own AI assistants)

- **Endpoint:** `POST /mcp` (Streamable HTTP, stateless JSON). Built with the official `mcp` SDK in `app/mcp/server.py`.
- **Auth:** a personal access token, `Authorization: Bearer ssk_…`, created on the site at `/library/connect` (`/api/v1/tokens`). Only its SHA-256 is stored; up to 5 per reader; revoking takes effect within a minute.
- **Tools:** `search_books`, `get_book`, `read_chapter`, `recommend_by_mood`, `recommend_for_me`, `list_my_shelf`, `add_to_shelf`, `summarize_chapter`, `ask_my_library`, and (admins) `import_gutenberg_book`. Resource: `book://{slug}`.
- Each tool calls the same service the website uses, as the token's owner. 120 calls a minute per token.

```bash
claude mcp add --transport http storyshelf http://localhost:8000/mcp --header "Authorization: Bearer ssk_…"
```

## Publishing, support and the admin console

| Area | Endpoints | Notes |
|---|---|---|
| Publish requests | `POST /publish/requests`, `GET /publish/requests/{ref}` | quote worked out on the server (`modules/publishing/pricing.py`, kept in step with `src/data/plans.ts` by a test); books the first call |
| Author dashboard | `GET /dashboard` (authors, admins) | in-production stage from the author's requests; titles and royalty statements from `author_titles` / `royalty_statements` |
| Tickets | `/support/tickets…` (signed in) | owner + admins only; admin replies post as the support team |
| Contact, calls | `POST /support/contact`, `GET /support/consultations/slots`, `POST /support/consultations` | no account needed; a unique index makes double-booking impossible |
| Help assistant | `POST /assistant/chat` | answers from `src/data/faqs.json` + the price sheet; without a model, the closest FAQ (or the price sheet) |
| Admin | `/admin/stats`, `/admin/imports…`, `/admin/books…`, `/admin/users…`, `/admin/publish-requests…`, `/admin/messages` | imports run as background jobs: download → licence check → chapters → embeddings → AI insights |

## Limits and hardening

- **Rate limits** (`core/rate_limit.py`): sign-in 10/min, forms 10 per 10 min, AI features 20/min, search 60/min, MCP 120/min, per account (bearer) or IP. `429` with `Retry-After`. Set `TRUST_PROXY_HEADERS=true` behind a host's proxy.
- **Daily AI allowance** per reader (`AI_DAILY_QUOTA_PER_USER`, default 100 model-written answers; cached answers are free). When it's spent, features degrade exactly as when every model is resting: Ask My Library still returns the passages.
- **Security headers** on every response; CSP and HSTS in production. CORS only for `API_CORS_ORIGINS`. `/docs` is off in production.

## Evals

```bash
python -m uv run python -m evals.search_eval    # search: hit@1 88%, MRR 0.910 on 25 queries → evals/RESULTS.md
python -m uv run python -m evals.ask_eval       # Ask My Library + help retrieval  → evals/RESULTS_ask.md
```

Known gaps, measured: a newly imported book without AI insights is found by a matching passage only if its thin profile vector also ranks it reasonably (the *Importance of Being Earnest* handbag query misses until the book is enriched); and in Ask My Library, questions phrased with words the book itself avoids ("the creature" in *Frankenstein*) can draw passages from other books.

## Deploy

See [../DEPLOY.md](../DEPLOY.md): Docker image (`backend/Dockerfile`, built from the repo root) on Render's free tier via `render.yaml`, Atlas M0 for data, the static site on Netlify.
