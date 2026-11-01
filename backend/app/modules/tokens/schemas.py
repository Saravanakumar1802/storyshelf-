from datetime import datetime

from pydantic import Field

from app.core.schemas import ApiModel


class TokenIn(ApiModel):
    name: str = Field(min_length=1, max_length=60)


class TokenOut(ApiModel):
    id: str
    name: str
    prefix: str  # the first characters, so the reader can tell tokens apart
    created_at: datetime
    last_used_at: datetime | None


class TokenCreated(TokenOut):
    token: str  # shown exactly once; only its hash is stored
