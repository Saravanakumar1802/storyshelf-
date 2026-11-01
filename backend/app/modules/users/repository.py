from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError

from app.core.errors import AppError, ErrorCode
from app.core.security import Role
from app.db.mongo import Database, Document
from app.modules.users.schemas import PlanId, UserPublic


def to_public(doc: Document) -> UserPublic:
    return UserPublic(
        id=str(doc["_id"]),
        name=doc["name"],
        email=doc["email"],
        role=doc["role"],
        plan=doc.get("plan"),
        phone=doc.get("phone"),
        joined_at=doc["joined_at"],
    )


class UsersRepository:
    def __init__(self, db: Database) -> None:
        self.col = db["users"]

    async def get_by_email(self, email: str) -> Document | None:
        return await self.col.find_one({"email": email.lower()})

    async def get_by_id(self, user_id: str) -> Document | None:
        try:
            oid = ObjectId(user_id)
        except InvalidId:
            return None
        return await self.col.find_one({"_id": oid})

    async def create(
        self, *, name: str, email: str, password_hash: str, role: Role, plan: PlanId | None = None
    ) -> Document:
        doc: dict[str, Any] = {
            "name": name,
            "email": email.lower(),
            "password_hash": password_hash,
            "role": role,
            "plan": plan,
            "joined_at": datetime.now(UTC),
        }
        try:
            result = await self.col.insert_one(doc)
        except DuplicateKeyError as exc:
            raise AppError(
                ErrorCode.CONFLICT,
                "An account with this email already exists. Try signing in.",
                {"email": "Already registered"},
            ) from exc
        doc["_id"] = result.inserted_id
        return doc
