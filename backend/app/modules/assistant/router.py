from fastapi import APIRouter, Request

from app.core.auth import OptionalUser
from app.core.rate_limit import limit
from app.modules.assistant.schemas import AssistantReply, ChatIn
from app.modules.assistant.service import HelpAssistant

router = APIRouter(prefix="/assistant", tags=["help assistant"])


def _assistant(request: Request) -> HelpAssistant:
    # one per app: it holds the FAQ vectors, and the models it uses can be swapped (tests)
    state = request.app.state
    current: HelpAssistant | None = getattr(state, "assistant", None)
    if current is None or current.llm is not state.llm or current.embedder is not state.embedder:
        current = state.assistant = HelpAssistant(state.llm, state.embedder)
    return current


@router.post(
    "/chat",
    dependencies=[limit("assistant", 20, 60)],
    response_model=AssistantReply,
    summary="Ask the help assistant",
)
async def chat(body: ChatIn, request: Request, user: OptionalUser) -> AssistantReply:
    return await _assistant(request).reply(body, user.id if user else None)
