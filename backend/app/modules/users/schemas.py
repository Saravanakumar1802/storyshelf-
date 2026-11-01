from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.core.security import Role

PlanId = Literal["kickstart", "levelUp", "pro"]


class UserPublic(BaseModel):
    """The user as the client sees it (camelCase fields match src/types in the Next.js app)."""

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    id: str
    name: str
    email: str
    role: Role
    plan: PlanId | None = None
    phone: str | None = None
    joined_at: datetime = Field(alias="joinedAt")
