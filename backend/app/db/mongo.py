"""MongoDB connection (PyMongo's native async client) and storage accounting."""

from typing import Any

from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import Settings

Document = dict[str, Any]
Database = AsyncDatabase[Document]

_BYTES_PER_MB = 1024 * 1024


class Mongo:
    """Owns the client for the app's lifetime; routes reach the database through `deps.get_db`."""

    def __init__(self) -> None:
        self._client: AsyncMongoClient[Document] | None = None
        self._db: Database | None = None

    async def connect(self, settings: Settings) -> None:
        uri = settings.mongodb_uri.get_secret_value()
        if not uri:
            raise RuntimeError("MONGODB_URI is not set (see backend/.env.example)")
        self._client = AsyncMongoClient(
            uri, appname="ai-library-api", serverSelectionTimeoutMS=10_000, tz_aware=True
        )
        self._db = self._client[settings.mongodb_db]
        await self._client.admin.command("ping")

    async def close(self) -> None:
        if self._client is not None:
            await self._client.close()
        self._client = self._db = None

    @property
    def db(self) -> Database:
        if self._db is None:
            raise RuntimeError("MongoDB is not connected")
        return self._db


mongo = Mongo()


async def storage_used_mb(db: Database) -> float:
    """Data + index size of this database, as counted against the Atlas storage quota."""
    stats = await db.command("dbStats")
    return round((float(stats.get("dataSize", 0)) + float(stats.get("indexSize", 0))) / _BYTES_PER_MB, 2)
