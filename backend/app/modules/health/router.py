from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel
from pymongo.errors import PyMongoError

from app.core.deps import DbDep, SettingsDep
from app.db.mongo import storage_used_mb

router = APIRouter(tags=["health"])


class StorageInfo(BaseModel):
    used_mb: float
    budget_mb: int


class Health(BaseModel):
    status: Literal["ok", "degraded"]
    database: Literal["ok", "unreachable"]
    storage: StorageInfo | None = None


@router.get("/health", response_model=Health, summary="Liveness and database reachability")
async def health(db: DbDep, settings: SettingsDep) -> Health:
    try:
        used = await storage_used_mb(db)
    except PyMongoError:
        return Health(status="degraded", database="unreachable")
    return Health(
        status="ok", database="ok", storage=StorageInfo(used_mb=used, budget_mb=settings.storage_budget_mb)
    )
