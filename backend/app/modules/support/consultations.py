"""
Consultation calls: the real diary.

Slots are hourly in India time, Monday to Saturday, with at least an hour's
notice. A slot is taken once anyone books it, from the consultation page or
from the publish wizard (which books the first call as part of the request).
A unique index on (date, slot) makes double-booking impossible even when two
people press the button at the same moment.
"""

from datetime import UTC, date, datetime, timedelta, timezone
from typing import Any

from pymongo.errors import DuplicateKeyError

from app.core.errors import AppError, ErrorCode
from app.core.ids import reference
from app.db.mongo import Database

IST = timezone(timedelta(hours=5, minutes=30), "IST")  # no daylight saving, so a fixed offset is exact
SLOTS = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"]
NOTICE = timedelta(hours=1)
BOOKING_WINDOW_DAYS = 60
SUNDAY = 6

_TAKEN = AppError(
    ErrorCode.CONFLICT,
    "That slot was just taken — please pick another time.",
    {"slot": "No longer available"},
)


def _day(value: str) -> date | None:
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def open_slots(day: str, booked: set[str], now: datetime | None = None) -> list[str]:
    d = _day(day)
    now = (now or datetime.now(UTC)).astimezone(IST)
    if (
        d is None
        or d.weekday() == SUNDAY
        or not now.date() <= d <= now.date() + timedelta(BOOKING_WINDOW_DAYS)
    ):
        return []
    out = []
    for slot in SLOTS:
        hour, minute = map(int, slot.split(":"))
        at = datetime(d.year, d.month, d.day, hour, minute, tzinfo=IST)
        if at - now >= NOTICE and slot not in booked:
            out.append(slot)
    return out


class Consultations:
    def __init__(self, db: Database) -> None:
        self.col = db["consultations"]

    async def slots(self, day: str) -> list[str]:
        booked = {d["slot"] async for d in self.col.find({"date": day}, {"slot": 1})}
        return open_slots(day, booked)

    async def book(self, *, date: str, slot: str, details: dict[str, Any], prefix: str = "CALL") -> str:
        """Reserves the slot and returns the booking reference; CONFLICT if it's gone."""
        if slot not in await self.slots(date):
            raise _TAKEN
        ref = reference(prefix)
        try:
            await self.col.insert_one(
                {"_id": ref, "date": date, "slot": slot, **details, "created_at": datetime.now(UTC)}
            )
        except DuplicateKeyError as exc:  # someone else got there between the check and the insert
            raise _TAKEN from exc
        return ref

    async def release(self, ref: str) -> None:
        await self.col.delete_one({"_id": ref})
