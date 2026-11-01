"""
Each signed-in reader's daily AI allowance (AI_DAILY_QUOTA_PER_USER).

Only answers a model actually wrote count: cached answers, retrieval and
search are free. The allowance resets at midnight UTC. Counts are kept in
memory, like the circuit breakers: one API process serves the library, and a
restart simply gives everyone a fresh day.
"""

from datetime import UTC, date, datetime

from app.core.errors import AppError, ErrorCode


class DailyQuota:
    def __init__(self, limit: int) -> None:
        self.limit = limit  # 0 = unlimited
        self._day: date | None = None
        self._used: dict[str, int] = {}

    def _today(self) -> dict[str, int]:
        today = datetime.now(UTC).date()
        if today != self._day:
            self._day, self._used = today, {}
        return self._used

    def check(self, user_id: str | None) -> None:
        if user_id and self.limit and self._today().get(user_id, 0) >= self.limit:
            raise AppError(
                ErrorCode.RATE_LIMITED,
                f"You've used today's {self.limit} AI answers. They reset at midnight UTC; "
                "reading and search keep working in the meantime.",
            )

    def spend(self, user_id: str | None) -> None:
        if user_id and self.limit:
            used = self._today()
            used[user_id] = used.get(user_id, 0) + 1

    def used(self, user_id: str) -> int:
        return self._today().get(user_id, 0)
