from typing import Annotated

from fastapi import APIRouter, Depends

from app.ai.prompts import MOODS
from app.core.auth import CurrentUser, OptionalUser
from app.core.deps import DbDep, EmbedderDep, LlmDep, VectorsDep
from app.core.rate_limit import limit
from app.modules.recommendations.schemas import MoodIn, MoodRecommendations, ReaderRecommendations
from app.modules.recommendations.service import RecommendationService

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def get_service(db: DbDep, llm: LlmDep, embedder: EmbedderDep, vectors: VectorsDep) -> RecommendationService:
    return RecommendationService(db, llm, embedder, vectors)


Service = Annotated[RecommendationService, Depends(get_service)]


@router.get(
    "/for-me", response_model=ReaderRecommendations, summary="Because you read…: picks from your shelves"
)
async def for_me(user: CurrentUser, service: Service) -> ReaderRecommendations:
    return await service.for_reader(user.id)


@router.post(
    "/mood",
    dependencies=[limit("ai", 20, 60)],
    response_model=MoodRecommendations,
    summary="Books for a mood or a described feeling",
)
async def by_mood(body: MoodIn, service: Service, user: OptionalUser) -> MoodRecommendations:
    return await service.by_mood(body, user.id if user else None)


@router.get("/moods", response_model=list[str], summary="The mood vocabulary the picker offers")
async def moods() -> list[str]:
    return list(MOODS)
