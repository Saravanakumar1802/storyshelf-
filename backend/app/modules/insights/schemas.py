from app.ai.schemas import AiMeta
from app.core.schemas import ApiModel


class BookAi(ApiModel):
    """AI-written insights about a book, shown with the chip of the model that wrote them."""

    summary: str
    hook: str
    themes: list[str]
    moods: list[str]
    tone: str
    reading_level: str
    content_notes: list[str]
    meta: AiMeta


class ChapterAi(ApiModel):
    summary: str
    key_moments: list[str]
    characters: list[str]
    meta: AiMeta
