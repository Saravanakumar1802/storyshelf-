"""
Answers that don't change (a book's summary, a parsed mood, a rewritten query)
are cached in MongoDB, so asking twice costs no free quota at all. Entries
expire through a TTL index.
"""

import hashlib
import json
from datetime import UTC, datetime, timedelta
from typing import Any

from app.db.mongo import Database, Document


def cache_key(payload: dict[str, Any]) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


class AiCache:
    def __init__(self, db: Database) -> None:
        self.col = db["ai_cache"]

    async def get(self, key: str) -> Document | None:
        return await self.col.find_one({"_id": key, "expires_at": {"$gt": datetime.now(UTC)}})

    async def put(self, key: str, *, text: str, provider: str, model: str, ttl_s: int) -> None:
        now = datetime.now(UTC)
        await self.col.replace_one(
            {"_id": key},
            {
                "text": text,
                "provider": provider,
                "model": model,
                "created_at": now,
                "expires_at": now + timedelta(seconds=ttl_s),
            },
            upsert=True,
        )
