from typing import Annotated

from fastapi import APIRouter, Path

from app.core.auth import CurrentUser
from app.core.deps import DbDep, LlmDep
from app.core.rate_limit import limit
from app.modules.insights.schemas import ChapterAi
from app.modules.insights.service import chapter_summary

router = APIRouter(tags=["insights"])


@router.post(
    "/books/{slug}/chapters/{index}/summary",
    dependencies=[limit("ai", 20, 60)],
    response_model=ChapterAi,
    summary="AI summary of a chapter (generated once, then shared)",
)
async def summarize_chapter(
    slug: Annotated[str, Path(max_length=120)],
    index: Annotated[int, Path(ge=0, le=2000)],
    user: CurrentUser,  # signed-in readers only, so the free quota isn't spent by bots
    db: DbDep,
    llm: LlmDep,
) -> ChapterAi:
    return await chapter_summary(db, llm, slug, index, user.id)
