"""Accounts that must exist: the admin from .env, and the demo author the sign-in page offers."""

import logging
import random
from datetime import UTC, datetime

from app.core.config import Settings
from app.core.security import Role, hash_password
from app.db.mongo import Database
from app.modules.users.repository import UsersRepository
from app.modules.users.schemas import PlanId

log = logging.getLogger(__name__)

# Shown on the sign-in page (DEMO_ACCOUNT in src/lib/api), so it is deliberately public.
DEMO_AUTHOR = {"name": "Meera Varghese", "email": "demo@storyshelf.in", "password": "publish123"}


async def _ensure_user(
    users: UsersRepository, *, name: str, email: str, password: str, role: Role, plan: PlanId | None
) -> None:
    if await users.get_by_email(email) is None:
        await users.create(
            name=name, email=email, password_hash=hash_password(password), role=role, plan=plan
        )
        log.info("Seeded %s account %s", role, email)


async def seed_accounts(db: Database, settings: Settings) -> None:
    users = UsersRepository(db)
    admin_password = settings.admin_password.get_secret_value()
    if settings.admin_email and admin_password:
        await _ensure_user(
            users,
            name="Library Admin",
            email=settings.admin_email,
            password=admin_password,
            role="admin",
            plan=None,
        )
    await _ensure_user(users, **DEMO_AUTHOR, role="author", plan="pro")
    await _seed_demo_publishing(db, users)


# The demo author's published title (a showcase book on the site) and a year of statements,
# so the dashboard has something real to show. Deterministic, and only written once.
DEMO_TITLE = {
    "slug": "the-monsoon-ledger",
    "channels": ["Amazon.in", "Flipkart", "StoryShelf Store", "Google Play", "Audible"],
    "status": "Live",
}


def _months_before(now: datetime, count: int) -> list[datetime]:
    out, year, month = [], now.year, now.month
    for _ in range(count):
        year, month = (year - 1, 12) if month == 1 else (year, month - 1)
        out.append(datetime(year, month, 1, tzinfo=UTC))
    return out[::-1]


async def _seed_demo_publishing(db: Database, users: UsersRepository) -> None:
    demo = await users.get_by_email(DEMO_AUTHOR["email"])
    if demo is None or await db["royalty_statements"].count_documents({"user_id": demo["_id"]}, limit=1):
        return
    rnd = random.Random(8085)
    base, rows = 60.0, []
    for i, month in enumerate(_months_before(datetime.now(UTC), 12)):
        base = max(10.0, base * (0.9 + rnd.random() * 0.35) + (60 if i == 3 else 0))  # a festive-season bump
        sales = round(base)
        rows.append(
            {
                "user_id": demo["_id"],
                "month_start": month,
                "sales": sales,
                "royalty": round(sales * (110 + rnd.random() * 30)),
            }
        )
    await db["royalty_statements"].insert_many(rows)
    await db["author_titles"].update_one(
        {"user_id": demo["_id"], "slug": DEMO_TITLE["slug"]},
        {
            "$setOnInsert": {
                **DEMO_TITLE,
                "copies_sold": sum(r["sales"] for r in rows),
                "added_at": datetime.now(UTC),
            }
        },
        upsert=True,
    )
    log.info("Seeded the demo author's title and royalty statements")
