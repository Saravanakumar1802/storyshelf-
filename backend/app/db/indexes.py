"""Every query the API runs is backed by one of these. Safe on each start: create_index is idempotent."""

from pymongo import ASCENDING, TEXT, IndexModel

from app.ai.llm.telemetry import RETENTION_DAYS
from app.db.mongo import Database

INDEXES: dict[str, list[IndexModel]] = {
    "users": [IndexModel([("email", ASCENDING)], unique=True, name="email_unique")],
    "refresh_tokens": [
        IndexModel([("token_hash", ASCENDING)], unique=True, name="token_hash_unique"),
        IndexModel([("family", ASCENDING)], name="family"),
        IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0, name="expires_ttl"),
    ],
    "books": [
        IndexModel([("slug", ASCENDING)], unique=True, name="slug_unique"),
        IndexModel([("gutenberg_id", ASCENDING)], unique=True, name="gutenberg_unique"),
        IndexModel(
            [("status", ASCENDING), ("featured_rank", ASCENDING), ("title", ASCENDING)], name="shelf_order"
        ),
        IndexModel(
            [("status", ASCENDING), ("genre", ASCENDING), ("featured_rank", ASCENDING)], name="genre_shelf"
        ),
        IndexModel(
            [("title", TEXT), ("author", TEXT), ("subjects", TEXT)],
            weights={"title": 10, "author": 6, "subjects": 1},
            default_language="english",
            name="keyword_search",
        ),
    ],
    "chapters": [
        IndexModel([("book_id", ASCENDING), ("index", ASCENDING)], unique=True, name="book_chapter")
    ],
    "shelf_items": [
        IndexModel([("user_id", ASCENDING), ("book_id", ASCENDING)], unique=True, name="user_book"),
        IndexModel([("user_id", ASCENDING), ("updated_at", ASCENDING)], name="user_recent"),
    ],
    "chat_threads": [IndexModel([("user_id", ASCENDING), ("updated_at", ASCENDING)], name="user_recent")],
    "chat_messages": [IndexModel([("thread_id", ASCENDING), ("created_at", ASCENDING)], name="thread_order")],
    "chunks": [IndexModel([("book_id", ASCENDING), ("seq", ASCENDING)], unique=True, name="book_seq")],
    "ai_calls": [
        IndexModel([("at", ASCENDING)], expireAfterSeconds=RETENTION_DAYS * 86_400, name="at_ttl"),
        IndexModel([("deployment", ASCENDING), ("at", ASCENDING)], name="deployment_at"),
    ],
    "api_tokens": [
        IndexModel([("token_hash", ASCENDING)], unique=True, name="token_hash_unique"),
        IndexModel([("user_id", ASCENDING), ("created_at", ASCENDING)], name="user_tokens"),
    ],
    "ingest_jobs": [
        IndexModel([("created_at", ASCENDING)], name="recent"),
        IndexModel([("gutenberg_id", ASCENDING), ("status", ASCENDING)], name="book_status"),
    ],
    "tickets": [IndexModel([("user_id", ASCENDING), ("updated_at", ASCENDING)], name="user_recent")],
    "contact_messages": [IndexModel([("at", ASCENDING)], name="recent")],
    "consultations": [
        IndexModel([("date", ASCENDING), ("slot", ASCENDING)], unique=True, name="one_call_per_slot")
    ],
    "publish_requests": [
        IndexModel([("user_id", ASCENDING), ("created_at", ASCENDING)], name="user_recent"),
        IndexModel([("author.email", ASCENDING)], name="author_email"),
        IndexModel([("created_at", ASCENDING)], name="recent"),
    ],
    "author_titles": [
        IndexModel([("user_id", ASCENDING), ("slug", ASCENDING)], unique=True, name="user_title")
    ],
    "royalty_statements": [
        IndexModel([("user_id", ASCENDING), ("month_start", ASCENDING)], unique=True, name="user_month")
    ],
    "ai_cache": [IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0, name="expires_ttl")],
}


async def ensure_indexes(db: Database) -> None:
    for collection, models in INDEXES.items():
        await db[collection].create_indexes(models)
