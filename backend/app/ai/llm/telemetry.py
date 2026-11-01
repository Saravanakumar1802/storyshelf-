"""
Every attempt to call a model is logged (never the prompt or the answer):
which deployment, for which task, how long it took, and whether it failed and
why. The public AI status panel and the evals are built from this log, which
expires after 14 days.
"""

import asyncio
import logging
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timedelta
from statistics import median
from typing import Any

from app.db.mongo import Database, Document

log = logging.getLogger(__name__)

RETENTION_DAYS = 14


@dataclass(frozen=True)
class Attempt:
    request_id: str
    task: str
    group: str
    deployment: str
    provider: str
    model: str
    ok: bool
    latency_ms: int
    failure: str | None = None
    fallback: bool = False  # not the chain's first choice
    cached: bool = False
    tokens_in: int | None = None
    tokens_out: int | None = None
    user_id: str | None = None


class CallLog:
    def __init__(self, db: Database) -> None:
        self.col = db["ai_calls"]
        self._pending: set[asyncio.Task[None]] = set()

    def record(self, attempt: Attempt) -> None:
        """Fire and forget: logging must never slow down or break an answer."""
        task = asyncio.create_task(self._insert(attempt))
        self._pending.add(task)
        task.add_done_callback(self._pending.discard)

    async def flush(self) -> None:
        if self._pending:
            await asyncio.gather(*self._pending, return_exceptions=True)

    async def _insert(self, attempt: Attempt) -> None:
        try:
            await self.col.insert_one({**asdict(attempt), "at": datetime.now(UTC)})
        except Exception:  # pragma: no cover - logged, never raised
            log.exception("Could not log AI call")

    # ── reads for the status panel ──

    async def per_deployment(self, since: datetime) -> dict[str, dict[str, Any]]:
        pipeline: list[dict[str, Any]] = [
            {"$match": {"at": {"$gte": since}, "cached": False}},
            {
                "$group": {
                    "_id": "$deployment",
                    "calls": {"$sum": 1},
                    "failures": {"$sum": {"$cond": ["$ok", 0, 1]}},
                    "latencies": {"$push": {"$cond": ["$ok", "$latency_ms", "$$REMOVE"]}},
                    "last_used_at": {"$max": "$at"},
                }
            },
        ]
        rows = await (await self.col.aggregate(pipeline)).to_list()
        return {
            r["_id"]: {
                "calls": r["calls"],
                "failures": r["failures"],
                "p50_latency_ms": int(median(r["latencies"])) if r["latencies"] else None,
                "last_used_at": r["last_used_at"],
            }
            for r in rows
        }

    async def totals(self, since: datetime) -> dict[str, Any]:
        pipeline: list[dict[str, Any]] = [
            {"$match": {"at": {"$gte": since}}},
            {
                "$group": {
                    "_id": "$request_id",
                    "ok": {"$max": {"$cond": ["$ok", 1, 0]}},
                    "fallback": {"$max": {"$cond": ["$fallback", 1, 0]}},
                    "cached": {"$max": {"$cond": ["$cached", 1, 0]}},
                    "latency": {"$sum": "$latency_ms"},
                }
            },
            {
                "$group": {
                    "_id": None,
                    "requests": {"$sum": 1},
                    "answered": {"$sum": "$ok"},
                    "fallbacks": {"$sum": "$fallback"},
                    "cache_hits": {"$sum": "$cached"},
                    "avg_latency": {"$avg": "$latency"},
                }
            },
        ]
        rows = await (await self.col.aggregate(pipeline)).to_list()
        r = rows[0] if rows else {}
        requests = r.get("requests", 0)
        return {
            "requests": requests,
            "answered": r.get("answered", 0),
            "fallbacks": r.get("fallbacks", 0),
            "cache_hits": r.get("cache_hits", 0),
            "avg_latency_ms": int(r["avg_latency"]) if r.get("avg_latency") is not None else None,
            "success_rate": round(r.get("answered", 0) / requests, 3) if requests else None,
        }

    async def recent(self, limit: int = 20) -> list[Document]:
        cursor = self.col.find({}, {"_id": 0, "user_id": 0, "request_id": 0}).sort("at", -1).limit(limit)
        return await cursor.to_list()


def since_hours(hours: int) -> datetime:
    return datetime.now(UTC) - timedelta(hours=hours)
