from typing import Annotated

from fastapi import APIRouter, Depends, Path, status

from app.core.auth import CurrentUser
from app.core.deps import DbDep
from app.core.rate_limit import limit
from app.modules.tokens.schemas import TokenCreated, TokenIn, TokenOut
from app.modules.tokens.service import TokensService

router = APIRouter(prefix="/tokens", tags=["access tokens"])

TokenId = Annotated[str, Path(min_length=24, max_length=24)]


def get_service(db: DbDep) -> TokensService:
    return TokensService(db)


Service = Annotated[TokensService, Depends(get_service)]


@router.get("", response_model=list[TokenOut], summary="The reader's personal access tokens")
async def list_tokens(user: CurrentUser, service: Service) -> list[TokenOut]:
    return await service.list(user.id)


@router.post(
    "",
    dependencies=[limit("forms", 10, 600)],
    response_model=TokenCreated,
    status_code=status.HTTP_201_CREATED,
    summary="Create a token for an AI assistant (the secret is returned once)",
)
async def create_token(body: TokenIn, user: CurrentUser, service: Service) -> TokenCreated:
    return await service.create(user.id, body.name)


@router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_token(token_id: TokenId, user: CurrentUser, service: Service) -> None:
    await service.revoke(user.id, token_id)
