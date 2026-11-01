# The StoryShelf API. Build from the repository root, because the help
# assistant reads the site's FAQs (src/data/faqs.json):
#
#   docker build -f backend/Dockerfile -t storyshelf-api .
#   docker run --env-file backend/.env -p 8000:8000 storyshelf-api

FROM python:3.13-slim AS app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

COPY --from=ghcr.io/astral-sh/uv:0.13 /uv /usr/local/bin/uv

WORKDIR /srv/backend

# dependencies first, so code changes don't reinstall them
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY backend/app ./app
COPY src/data/faqs.json /srv/src/data/faqs.json

# bake the embedding model into the image: no download on a cold start
RUN uv run --no-sync python -c "from app.ai.embeddings import Embedder; Embedder('BAAI/bge-small-en-v1.5').embed_query_sync('warm up')"

RUN useradd --create-home --uid 10001 api && chown -R api /srv
USER api

EXPOSE 8000
# PORT is set by most hosts (Render, Fly, Railway); 8000 locally
CMD ["sh", "-c", "uv run --no-sync uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
