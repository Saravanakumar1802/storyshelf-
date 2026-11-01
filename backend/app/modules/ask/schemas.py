from datetime import datetime
from typing import Literal

from pydantic import Field

from app.ai.schemas import AiMeta
from app.core.schemas import ApiModel


class SourceBook(ApiModel):
    slug: str
    title: str
    author: str


class Source(ApiModel):
    """One retrieved passage, numbered as the answer cites it ([1], [2], …)."""

    n: int
    book: SourceBook
    chapter: int
    chapter_title: str
    excerpt: str


class Message(ApiModel):
    id: str
    role: Literal["reader", "librarian"]
    content: str
    sources: list[Source] = Field(default_factory=list)
    meta: AiMeta | None = None
    # set when the AI couldn't answer (the sources are still useful)
    error: str | None = None
    created_at: datetime


class ThreadIn(ApiModel):
    scope: Literal["shelf", "book"] = "shelf"
    book: str | None = Field(default=None, max_length=120)  # slug, for scope "book"


class Thread(ApiModel):
    id: str
    title: str
    scope: Literal["shelf", "book"]
    book: SourceBook | None = None
    created_at: datetime
    updated_at: datetime


class ThreadDetail(Thread):
    messages: list[Message]


class QuestionIn(ApiModel):
    question: str = Field(min_length=3, max_length=500)
