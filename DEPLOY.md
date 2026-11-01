# Deploying StoryShelf

Three free pieces: the **database** (MongoDB Atlas M0), the **API** (a Docker web service, e.g. Render free), and the **site** (a static export on Netlify).

```
Netlify (out/)  ──HTTPS: REST + SSE──►  API (Render, Docker)  ──►  MongoDB Atlas M0
                                         └── /mcp for readers' AI assistants
```

## 1. Database: MongoDB Atlas

1. Create a free M0 cluster, a database user (read/write) and allow the API host's IP (or `0.0.0.0/0` for Render free, which has no fixed IP).
2. Copy the `mongodb+srv://…` string. The API creates its indexes and seeds the admin and demo accounts on start.
3. Fill the library once, from your machine (`backend/.env` pointing at the cluster):

   ```bash
   cd backend
   python -m uv run python -m app.scripts.ingest_curated     # ~60 classics, stops at STORAGE_BUDGET_MB
   python -m uv run python -m app.scripts.embed_library      # passages + vectors + Atlas vector indexes (CPU, ~40 min)
   python -m uv run python -m app.scripts.enrich_books       # AI insights (needs at least one LLM key)
   ```

## 2. API: Render (or any Docker host)

1. Push the repository, then in Render choose **New → Blueprint** and pick `render.yaml`. It builds `backend/Dockerfile` from the repo root (the help assistant reads `src/data/faqs.json`) with the embedding model baked into the image.
2. Set the secrets it asks for: `MONGODB_URI`, `API_CORS_ORIGINS` (your Netlify URL), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and whichever LLM keys you have. `JWT_SECRET` is generated.
3. Check `https://<api>/api/v1/health` → `{"status":"ok","database":"ok",…}` and `https://<site>/ai` once the site is up.
4. After adding keys, check every model from your machine: `python -m uv run python -m app.scripts.check_models`.

Free-tier note: Render free services sleep after 15 minutes idle; the first request then takes ~30 s. The site shows its normal loading states meanwhile.

Without Docker: `uv sync --no-dev` then `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers`, with the repo's `src/data/faqs.json` next to `backend/`.

## 3. Site: Netlify

```bash
# point the site at the API, then build the static export
echo NEXT_PUBLIC_API_URL=https://<api> > .env.local
python -m uv --directory backend run python -m app.scripts.export_catalog   # fresh book pages from the live library
npm run build:static
```

Drag `out/` onto Netlify Drop (or connect the repo with build command `npm run build:static`, publish directory `out`). Redirects for old URLs are generated into `out/_redirects`.

Books imported later from the admin console are readable straight away at `/library/view?book=…`; re-run `export_catalog` and rebuild to give them static, indexable pages.

## Checklist

- [ ] `APP_ENV=production` (turns off `/docs`, adds CSP and HSTS)
- [ ] `API_CORS_ORIGINS` is exactly the site's origin
- [ ] `TRUST_PROXY_HEADERS=true` behind Render's proxy (rate limits by real IP)
- [ ] the Atlas password you shared while building was rotated
- [ ] the demo account (`demo@storyshelf.in` / `publish123`) is wanted in production; otherwise delete it from the admin console's database or change its password
