"""
Support tickets and contact messages.

A ticket belongs to the signed-in account that raised it; its owner and the
admins (the support team) can read it. Replies from an admin are posted as
the support team. Contact messages need no account: they are write-only from
the site and read in the admin console.
"""

from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from pymongo import ReturnDocument

from app.core.errors import AppError, ErrorCode
from app.core.ids import reference
from app.db.mongo import Database, Document
from app.modules.support.schemas import ContactIn, Ticket, TicketIn, TicketMessage, TicketStatus
from app.modules.users.schemas import UserPublic

SUPPORT_NAME = "StoryShelf Author Support"
MAX_TICKETS = 100
_NOT_FOUND = AppError(ErrorCode.NOT_FOUND, "We couldn't find that ticket.")


def _message(sender: str, name: str, body: str, at: datetime) -> dict[str, Any]:
    return {"id": reference("M", 10), "from": sender, "name": name, "body": body, "at": at}


def to_ticket(doc: Document) -> Ticket:
    return Ticket(
        id=doc["_id"],
        subject=doc["subject"],
        category=doc["category"],
        priority=doc["priority"],
        status=doc["status"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        email=doc["email"],
        attachments=doc["attachments"],
        messages=[TicketMessage.model_validate(m) for m in doc["messages"]],
    )


class SupportService:
    def __init__(self, db: Database) -> None:
        self.tickets = db["tickets"]
        self.contact = db["contact_messages"]

    async def create_ticket(self, user: UserPublic, body: TicketIn) -> Ticket:
        now = datetime.now(UTC)
        first = user.name.split(" ")[0]
        ack = (
            f"Thanks, {first}! We've received your request about “{body.subject}”. "
            "A member of the team will reply here within one working day, usually much sooner."
        )
        doc: dict[str, Any] = {
            "_id": reference("TKT"),
            "user_id": ObjectId(user.id),
            "subject": body.subject,
            "category": body.category,
            "priority": body.priority,
            "status": "open",
            "email": body.email,
            "attachments": body.attachments,
            "messages": [
                _message("author", user.name, body.message, now),
                _message("support", SUPPORT_NAME, ack, now),
            ],
            "created_at": now,
            "updated_at": now,
        }
        await self.tickets.insert_one(doc)
        return to_ticket(doc)

    async def list_tickets(self, user: UserPublic, *, everyone: bool = False) -> list[Ticket]:
        query = {} if everyone and user.role == "admin" else {"user_id": ObjectId(user.id)}
        docs = await self.tickets.find(query).sort("updated_at", -1).to_list(MAX_TICKETS)
        return [to_ticket(d) for d in docs]

    async def _visible(self, user: UserPublic, ticket_id: str) -> Document:
        doc = await self.tickets.find_one({"_id": ticket_id})
        if doc is None or (user.role != "admin" and str(doc["user_id"]) != user.id):
            raise _NOT_FOUND  # someone else's ticket looks the same as a missing one
        return doc

    async def get_ticket(self, user: UserPublic, ticket_id: str) -> Ticket:
        return to_ticket(await self._visible(user, ticket_id))

    async def reply(self, user: UserPublic, ticket_id: str, body: str) -> Ticket:
        doc = await self._visible(user, ticket_id)
        if doc["status"] == "resolved":
            raise AppError(ErrorCode.CONFLICT, "This ticket is resolved. Reopen it to reply.")
        as_support = user.role == "admin" and str(doc["user_id"]) != user.id
        now = datetime.now(UTC)
        message = _message(
            "support" if as_support else "author",
            f"{user.name} · {SUPPORT_NAME}" if as_support else user.name,
            body,
            now,
        )
        updated = await self.tickets.find_one_and_update(
            {"_id": doc["_id"]},
            {"$push": {"messages": message}, "$set": {"status": "in-progress", "updated_at": now}},
            return_document=ReturnDocument.AFTER,
        )
        assert updated is not None
        return to_ticket(updated)

    async def set_status(self, user: UserPublic, ticket_id: str, status: TicketStatus) -> Ticket:
        doc = await self._visible(user, ticket_id)
        updated = await self.tickets.find_one_and_update(
            {"_id": doc["_id"]},
            {"$set": {"status": status, "updated_at": datetime.now(UTC)}},
            return_document=ReturnDocument.AFTER,
        )
        assert updated is not None
        return to_ticket(updated)

    async def send_contact(self, body: ContactIn, user: UserPublic | None) -> str:
        ref = reference("MSG")
        await self.contact.insert_one(
            {
                "_id": ref,
                **body.model_dump(),
                "user_id": ObjectId(user.id) if user else None,
                "at": datetime.now(UTC),
            }
        )
        return ref
