"""
Personal access tokens: how a reader's own AI assistant (Claude, Cursor…)
signs in to the MCP server.

A token is a long random string shown once at creation; only its SHA-256 is
stored, like refresh tokens. It acts as its owner, with the owner's current
role, until it is revoked. Tokens are prefixed `ssk_` so they are easy to
recognise in a config file (and for secret scanners).
"""

from datetime import UTC, datetime

from bson import ObjectId
from bson.errors import InvalidId

from app.core.errors import AppError, ErrorCode
from app.core.security import new_opaque_token, sha256
from app.db.mongo import Database, Document
from app.modules.tokens.schemas import TokenCreated, TokenOut
from app.modules.users.repository import UsersRepository, to_public
from app.modules.users.schemas import UserPublic

PREFIX = "ssk_"
MAX_TOKENS = 5
_SHOWN = 8  # characters of the token kept for display


def _out(doc: Document) -> TokenOut:
    return TokenOut(
        id=str(doc["_id"]),
        name=doc["name"],
        prefix=doc["prefix"],
        created_at=doc["created_at"],
        last_used_at=doc.get("last_used_at"),
    )


class TokensService:
    def __init__(self, db: Database) -> None:
        self.col = db["api_tokens"]
        self.db = db

    async def create(self, user_id: str, name: str) -> TokenCreated:
        owner = ObjectId(user_id)
        if await self.col.count_documents({"user_id": owner}) >= MAX_TOKENS:
            raise AppError(
                ErrorCode.CONFLICT, f"You can have up to {MAX_TOKENS} tokens. Revoke one you no longer use."
            )
        token = PREFIX + new_opaque_token()
        doc: dict[str, object] = {
            "user_id": owner,
            "name": name.strip(),
            "token_hash": sha256(token),
            "prefix": token[: len(PREFIX) + _SHOWN],
            "created_at": datetime.now(UTC),
            "last_used_at": None,
        }
        doc["_id"] = (await self.col.insert_one(doc)).inserted_id
        return TokenCreated(**_out(doc).model_dump(), token=token)

    async def list(self, user_id: str) -> list[TokenOut]:
        docs = await self.col.find({"user_id": ObjectId(user_id)}).sort("created_at", -1).to_list(MAX_TOKENS)
        return [_out(d) for d in docs]

    async def revoke(self, user_id: str, token_id: str) -> None:
        try:
            oid = ObjectId(token_id)
        except InvalidId as exc:
            raise AppError(ErrorCode.NOT_FOUND, "We couldn't find that token.") from exc
        result = await self.col.delete_one({"_id": oid, "user_id": ObjectId(user_id)})
        if result.deleted_count == 0:
            raise AppError(ErrorCode.NOT_FOUND, "We couldn't find that token.")

    async def authenticate(self, token: str) -> UserPublic | None:
        """The token's owner, or None for an unknown or revoked token."""
        if not token.startswith(PREFIX):
            return None
        doc = await self.col.find_one_and_update(
            {"token_hash": sha256(token)}, {"$set": {"last_used_at": datetime.now(UTC)}}
        )
        if doc is None:
            return None
        user = await UsersRepository(self.db).get_by_id(str(doc["user_id"]))
        return to_public(user) if user else None
