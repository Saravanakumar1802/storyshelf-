from datetime import datetime
from typing import Literal

from pydantic import Field

from app.core.schemas import ApiModel
from app.modules.books.schemas import BookSummary

ShelfStatus = Literal["want", "reading", "finished"]


class ShelfItem(ApiModel):
    book: BookSummary
    status: ShelfStatus
    chapter: int  # where the reader is (0-based)
    progress: float  # 0..1, by chapters
    added_at: datetime
    updated_at: datetime


class SetStatusIn(ApiModel):
    status: ShelfStatus


class ProgressIn(ApiModel):
    chapter: int = Field(ge=0, le=2000)
