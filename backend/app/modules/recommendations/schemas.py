from pydantic import Field

from app.ai.prompts import Mood
from app.ai.schemas import AiMeta
from app.core.schemas import ApiModel
from app.modules.books.schemas import BookSummary


class Recommendation(ApiModel):
    book: BookSummary
    reason: str
    # the shelf book this pick is closest to ("because you read …")
    because: str | None = None
    ai_written: bool = False


class ReaderRecommendations(ApiModel):
    items: list[Recommendation]
    basis: list[str]  # the shelf titles the picks were drawn from
    meta: AiMeta | None = None
    note: str | None = None


class MoodIn(ApiModel):
    moods: list[Mood] = Field(default_factory=list, max_length=4)
    text: str | None = Field(default=None, max_length=200)
    max_minutes: int | None = Field(default=None, ge=10, le=6000)


class Interpreted(ApiModel):
    moods: list[str]
    themes: list[str]
    max_minutes: int | None
    search_text: str


class MoodRecommendations(ApiModel):
    items: list[Recommendation]
    interpreted: Interpreted
    parse_meta: AiMeta | None = None  # the model that read the request
    meta: AiMeta | None = None  # the model that wrote the reasons
