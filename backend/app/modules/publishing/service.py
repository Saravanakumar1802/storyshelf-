"""
Publish requests (the wizard on /publish) and the author dashboard built from them.

A request books its first consultation call in the same step, so the slot is
held for the author. Its quote is worked out here, never taken from the
browser. The publishing team moves a request through the eight stages from
the admin console, and the author's dashboard follows along.

Published titles and royalty statements come from the publishing team's
records (`author_titles`, `royalty_statements`); a new author simply has none
yet, and the dashboard says so.
"""

from datetime import UTC, date, datetime, timedelta
from typing import Any

from bson import ObjectId
from pymongo import ReturnDocument

from app.core.errors import AppError, ErrorCode
from app.core.ids import reference
from app.db.mongo import Database, Document
from app.modules.publishing.pricing import calc_quote
from app.modules.publishing.schemas import (
    STAGES,
    Campaign,
    Dashboard,
    InProduction,
    PublishedTitle,
    PublishIn,
    PublishRequest,
    RoyaltyMonth,
    TeamMember,
    Totals,
)
from app.modules.support.consultations import Consultations
from app.modules.users.schemas import UserPublic

NEXT_STEP = [
    "Your consultation call",
    "Sign your agreement",
    "Review your editor's notes",
    "Choose a cover concept",
    "Approve the final proofs",
    "Check your store listings",
    "Approve your launch campaign",
    "Your first royalty statement",
]
STAGE_DAYS = 7  # the usual time the team aims to spend on a stage
TEAM = [
    TeamMember(role="Publishing Consultant", name="Arjun Menon", email="arjun@storyshelf.in"),
    TeamMember(role="Publication Manager", name="Sana Qureshi", email="sana@storyshelf.in"),
]
MAX_REQUESTS = 50
_NOT_FOUND = AppError(ErrorCode.NOT_FOUND, "We couldn't find that request.")


def to_request(doc: Document) -> PublishRequest:
    return PublishRequest(
        id=doc["_id"],
        created_at=doc["created_at"],
        author=doc["author"],
        manuscript=doc["manuscript"],
        plan=doc["plan"],
        addons=doc["addons"],
        consultation={"date": doc["consultation"]["date"], "slot": doc["consultation"]["slot"]},
        quote=doc["quote"],
        stage=STAGES[doc["stage_index"]],
        stage_index=doc["stage_index"],
    )


def _due(doc: Document, today: date) -> str:
    if doc["stage_index"] == 0:
        day = date.fromisoformat(doc["consultation"]["date"])
        return f"{day.strftime('%a %d %b')}, {doc['consultation']['slot']} IST"
    target = (doc["stage_updated_at"] + timedelta(days=STAGE_DAYS)).date()
    days = (target - today).days
    return "today" if days == 0 else f"in {days} days" if days > 0 else "this week"


def next_payout(today: date, quarterly: bool) -> date:
    if quarterly:
        for month, day in ((3, 31), (6, 30), (9, 30), (12, 31)):
            if (when := date(today.year, month, day)) >= today:
                return when
        return date(today.year + 1, 3, 31)
    when = date(today.year, 3, 31)
    return when if when >= today else date(today.year + 1, 3, 31)


def previous_payout(payout: date, quarterly: bool) -> date:
    return next_payout(payout - timedelta(days=95 if quarterly else 370), quarterly)


def campaigns(plan: str | None) -> list[Campaign]:
    pro, kick = plan == "pro", plan in (None, "kickstart")
    included, addon = "In your plan", "—"
    return [
        Campaign(name="Digital posters", status="Completed", metric="2 delivered" if pro else "1 delivered"),
        Campaign(
            name="YouTube feature",
            status="Available as add-on" if kick else "Live",
            metric=addon if kick else included,
        ),
        Campaign(
            name="Amazon Sponsored (30 days)",
            status="Live" if pro else "Available as add-on",
            metric=included if pro else addon,
        ),
        Campaign(
            name="Amazon A+ & Author Page",
            status="Live" if pro else "Available as add-on",
            metric=included if pro else addon,
        ),
        Campaign(
            name="StoryShelf store promo code",
            status="Scheduled" if pro else "Available as add-on",
            metric=included if pro else addon,
        ),
    ]


class PublishingService:
    def __init__(self, db: Database) -> None:
        self.db = db
        self.requests = db["publish_requests"]

    async def submit(self, body: PublishIn, user: UserPublic | None) -> PublishRequest:
        ref = reference("PUB")
        quote = calc_quote(body.plan.plan, body.plan.addons, body.manuscript.pages)
        call = await Consultations(self.db).book(
            date=body.consultation.date,
            slot=body.consultation.slot,
            details={
                "source": "publish",
                "request": ref,
                "name": body.author.name,
                "email": body.author.email,
            },
            prefix="CALL",
        )
        now = datetime.now(UTC)
        doc: dict[str, Any] = {
            "_id": ref,
            "user_id": ObjectId(user.id) if user else None,
            "author": body.author.model_dump(),
            "manuscript": body.manuscript.model_dump(),
            "plan": body.plan.plan,
            "addons": body.plan.addons,
            "consultation": {"date": body.consultation.date, "slot": body.consultation.slot, "ref": call},
            "quote": quote.__dict__,
            "stage_index": 0,
            "stage_updated_at": now,
            "created_at": now,
        }
        try:
            await self.requests.insert_one(doc)
        except Exception:
            await Consultations(self.db).release(call)  # don't hold a slot for a request that doesn't exist
            raise
        return to_request(doc)

    async def get(self, ref: str) -> PublishRequest:
        """By reference: the confirmation page opens it from the link, signed in or not."""
        doc = await self.requests.find_one({"_id": ref})
        if doc is None:
            raise _NOT_FOUND
        return to_request(doc)

    def _mine(self, user: UserPublic) -> dict[str, Any]:
        # requests sent before signing up are matched by the email they were sent from
        return {"$or": [{"user_id": ObjectId(user.id)}, {"author.email": user.email}]}

    async def list_all(self) -> list[PublishRequest]:
        docs = await self.requests.find().sort("created_at", -1).to_list(MAX_REQUESTS)
        return [to_request(d) for d in docs]

    async def set_stage(self, ref: str, stage_index: int) -> PublishRequest:
        doc = await self.requests.find_one_and_update(
            {"_id": ref},
            {"$set": {"stage_index": stage_index, "stage_updated_at": datetime.now(UTC)}},
            return_document=ReturnDocument.AFTER,
        )
        if doc is None:
            raise _NOT_FOUND
        return to_request(doc)

    async def dashboard(self, user: UserPublic) -> Dashboard:
        today = datetime.now(UTC).date()
        docs = await self.requests.find(self._mine(user)).sort("created_at", -1).to_list(MAX_REQUESTS)
        current = next((d for d in docs if d["stage_index"] < len(STAGES) - 1), None)
        owner = ObjectId(user.id)
        titles = await self.db["author_titles"].find({"user_id": owner}).sort("added_at", 1).to_list()
        statements = (
            await self.db["royalty_statements"].find({"user_id": owner}).sort("month_start", -1).to_list(12)
        )
        statements.reverse()

        quarterly = user.plan == "pro"
        payout = next_payout(today, quarterly)
        # a payout settles the period that closed at the previous payout date (statements lag a period),
        # so what's due next is everything earned after the period before that one closed
        settled_to = previous_payout(previous_payout(payout, quarterly), quarterly)
        royalties = [
            RoyaltyMonth(month=s["month_start"].strftime("%b"), sales=s["sales"], royalty=s["royalty"])
            for s in statements
        ]
        return Dashboard(
            in_production=InProduction(
                id=current["_id"],
                title=current["manuscript"]["title"],
                stage=STAGES[current["stage_index"]],
                stage_index=current["stage_index"],
                next_step=NEXT_STEP[current["stage_index"]],
                due=_due(current, today),
            )
            if current
            else None,
            requests=[to_request(d) for d in docs],
            published=[
                PublishedTitle(
                    slug=t["slug"], channels=t["channels"], copies_sold=t["copies_sold"], status=t["status"]
                )
                for t in titles
            ],
            royalties=royalties,
            totals=Totals(
                lifetime_royalty=sum(r.royalty for r in royalties),
                copies=sum(r.sales for r in royalties),
                next_payout=payout.strftime("%d %b %Y"),
                payout_frequency="Quarterly" if quarterly else "Annually",
                balance=sum(s["royalty"] for s in statements if s["month_start"].date() > settled_to),
            ),
            campaigns=campaigns(user.plan) if titles else [],
            team=TEAM,
        )
