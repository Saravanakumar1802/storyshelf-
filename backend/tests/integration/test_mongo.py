"""Runs against the real Atlas cluster from backend/.env. Skipped when MONGODB_URI is not set."""

import pytest

from app.core.config import get_settings
from app.db.mongo import Mongo, storage_used_mb

pytestmark = pytest.mark.integration

settings = get_settings()
requires_db = pytest.mark.skipif(not settings.mongodb_uri.get_secret_value(), reason="MONGODB_URI not set")


@requires_db
async def test_connects_and_reports_storage_within_budget() -> None:
    m = Mongo()
    await m.connect(settings)
    try:
        used = await storage_used_mb(m.db)
        assert 0 <= used < settings.storage_budget_mb
    finally:
        await m.close()
