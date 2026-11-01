from typing import Annotated, Literal

from pydantic import Field

from app.ai.schemas import AiMeta
from app.core.schemas import ApiModel
from app.core.validators import min_chars, trimmed


class ChatMessage(ApiModel):
    role: Literal["user", "assistant"]
    content: Annotated[str, trimmed(500), min_chars(1, "Ask a question")]


class ChatIn(ApiModel):
    # the last few turns, so follow-ups make sense; the newest is the question
    messages: list[ChatMessage] = Field(min_length=1, max_length=8)


class Link(ApiModel):
    href: str
    label: str


class SourceFaq(ApiModel):
    id: str
    q: str


class AssistantReply(ApiModel):
    answer: str
    links: list[Link]
    sources: list[SourceFaq]  # the FAQs the answer is drawn from
    needs_person: bool = False
    meta: AiMeta | None = None  # null when the answer is the FAQ's own words
