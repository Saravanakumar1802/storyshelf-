from datetime import datetime
from typing import Literal

from pydantic import Field

from app.core.schemas import ApiModel
from app.core.security import Role

JobStatus = Literal["queued", "importing", "embedding", "enriching", "done", "failed"]


class ImportIn(ApiModel):
    gutenberg_id: int = Field(ge=1, le=999_999)


class ImportJob(ApiModel):
    id: str
    gutenberg_id: int
    status: JobStatus
    detail: str
    title: str | None = None
    slug: str | None = None
    created_at: datetime
    finished_at: datetime | None = None


class ImportPreview(ApiModel):
    """What an import would bring in, checked without storing anything."""

    gutenberg_id: int
    title: str
    author: str
    language: str
    words: int
    chapters: int
    estimated_mb: float
    allowed: bool
    reason: str  # why it can or can't be imported
    in_library: bool


class Stats(ApiModel):
    books: int
    hidden_books: int
    passages: int
    readers: int
    authors: int
    admins: int
    storage_mb: float
    storage_budget_mb: int
    ai_calls: int  # in the last 24 hours
    ai_failures: int
    tickets_open: int
    publish_requests: int


class AdminBook(ApiModel):
    id: str
    slug: str
    title: str
    author: str
    genre: str
    status: Literal["published", "hidden"]
    words: int
    passages: int
    has_ai: bool
    gutenberg_id: int
    added_at: datetime


class BookStatusIn(ApiModel):
    status: Literal["published", "hidden"]


class AdminUser(ApiModel):
    id: str
    name: str
    email: str
    role: Role
    joined_at: datetime


class RoleIn(ApiModel):
    role: Role


class ContactMessage(ApiModel):
    id: str
    name: str
    email: str
    phone: str | None
    topic: str
    message: str
    at: datetime
