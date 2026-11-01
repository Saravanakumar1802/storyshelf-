"""
Ask My Library over HTTP. The answer streams as Server-Sent Events:

    event: sources   data: [{"n": 1, "book": {...}, "chapterTitle": "...", "excerpt": "..."}, ...]
    event: token     data: "Elizabeth "           (repeated)
    event: done      data: {"messageId": "...", "meta": {...AiMeta}}
or  event: error     data: {"code": "AI_UNAVAILABLE", "message": "..."}

The site reads it with fetch() rather than EventSource, because EventSource
can't send the Authorization header or a POST body.
"""

import json
from collections.abc import AsyncIterator
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Path, status
from fastapi.responses import StreamingResponse

from app.core.auth import CurrentUser
from app.core.deps import DbDep, EmbedderDep, LlmDep, VectorsDep
from app.core.rate_limit import limit
from app.modules.ask.schemas import QuestionIn, Thread, ThreadDetail, ThreadIn
from app.modules.ask.service import AskService

router = APIRouter(prefix="/ask", tags=["ask my library"])

ThreadId = Annotated[str, Path(min_length=24, max_length=24)]


def get_service(db: DbDep, llm: LlmDep, embedder: EmbedderDep, vectors: VectorsDep) -> AskService:
    return AskService(db, llm, embedder, vectors)


Service = Annotated[AskService, Depends(get_service)]


def _sse(event: str, data: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post(
    "/threads",
    dependencies=[limit("ask", 30, 60)],
    response_model=Thread,
    status_code=status.HTTP_201_CREATED,
)
async def create_thread(body: ThreadIn, user: CurrentUser, service: Service) -> Thread:
    return await service.create_thread(user.id, body)


@router.get("/threads", response_model=list[Thread])
async def list_threads(user: CurrentUser, service: Service) -> list[Thread]:
    return await service.list_threads(user.id)


@router.get("/threads/{thread_id}", response_model=ThreadDetail)
async def get_thread(thread_id: ThreadId, user: CurrentUser, service: Service) -> ThreadDetail:
    return await service.get_thread(user.id, thread_id)


@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_thread(thread_id: ThreadId, user: CurrentUser, service: Service) -> None:
    await service.delete_thread(user.id, thread_id)


@router.post(
    "/threads/{thread_id}/messages",
    dependencies=[limit("ask", 20, 60)],
    summary="Ask a question; the answer streams back (SSE)",
)
async def ask(
    thread_id: ThreadId, body: QuestionIn, user: CurrentUser, service: Service
) -> StreamingResponse:
    run = await service.prepare(user.id, thread_id, body)  # 404 / 409 surface here, as JSON

    async def events() -> AsyncIterator[str]:
        async for event, data in service.answer(run):
            yield _sse(event, data)

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        # no proxy buffering, so tokens arrive as they are written
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
