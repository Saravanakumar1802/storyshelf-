from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.ai.llm.telemetry import CallLog
from app.core.deps import DbDep, LlmDep, SettingsDep
from app.modules.ai_status.schemas import AiStatus
from app.modules.ai_status.service import AiStatusService

router = APIRouter(prefix="/ai", tags=["ai"])


def get_service(request: Request, llm: LlmDep, db: DbDep, settings: SettingsDep) -> AiStatusService:
    # one instance per app, so its short response cache is shared across requests
    service: AiStatusService | None = getattr(request.app.state, "ai_status", None)
    if service is None:
        service = AiStatusService(llm, CallLog(db), settings.embedding_model)
        request.app.state.ai_status = service
    return service


@router.get("/status", response_model=AiStatus, summary="Live health of every model behind the library")
async def status(service: Annotated[AiStatusService, Depends(get_service)]) -> AiStatus:
    return await service.status()
