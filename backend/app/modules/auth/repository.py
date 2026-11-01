"""
Refresh tokens with rotation and reuse detection.

Each sign-in starts a token *family*. Every refresh retires the presented token
and issues a new one in the same family. If a retired token is ever presented
again, someone replayed a stolen token, so the whole family is revoked and the
user must sign in again.
"""

from datetime import UTC, datetime, timedelta

from bson import ObjectId

from app.core.security import new_opaque_token, sha256
from app.db.mongo import Database, Document


class RefreshTokensRepository:
    def __init__(self, db: Database) -> None:
        self.col = db["refresh_tokens"]

    async def issue(self, user_id: ObjectId, ttl: timedelta, family: str | None = None) -> str:
        token = new_opaque_token()
        now = datetime.now(UTC)
        await self.col.insert_one(
            {
                "token_hash": sha256(token),
                "user_id": user_id,
                "family": family or new_opaque_token(),
                "created_at": now,
                "expires_at": now + ttl,  # TTL index removes it afterwards
                "revoked_at": None,
            }
        )
        return token

    async def consume(self, token: str) -> Document | None:
        """
        Atomically retire a live token and return it. Returns None for unknown,
        expired or already-retired tokens; a retired one also revokes its family.
        """
        now = datetime.now(UTC)
        token_hash = sha256(token)
        doc = await self.col.find_one_and_update(
            {"token_hash": token_hash, "revoked_at": None, "expires_at": {"$gt": now}},
            {"$set": {"revoked_at": now}},
        )
        if doc is not None:
            return doc
        reused = await self.col.find_one({"token_hash": token_hash, "revoked_at": {"$ne": None}})
        if reused is not None:
            await self.revoke_family(reused["family"])
        return None

    async def revoke_family(self, family: str) -> None:
        await self.col.update_many(
            {"family": family, "revoked_at": None}, {"$set": {"revoked_at": datetime.now(UTC)}}
        )
