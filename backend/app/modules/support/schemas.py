from datetime import datetime
from typing import Annotated, Literal

from pydantic import Field

from app.core.schemas import ApiModel
from app.core.validators import Email, Name, OptionalPhone, Phone, min_chars, trimmed

TicketCategory = Literal[
    "Manuscript & Editing",
    "Cover & Design",
    "Distribution",
    "Royalties & Payments",
    "Marketing",
    "Account",
    "Other",
]
TicketPriority = Literal["low", "normal", "high"]
TicketStatus = Literal["open", "in-progress", "resolved"]
ContactTopic = Literal[
    "Publishing enquiry", "Existing author", "Library & reading", "Press & partnerships", "Other"
]
Date = Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}$")]


class TicketIn(ApiModel):
    subject: Annotated[str, trimmed(120), min_chars(6, "Add a short subject (6+ characters)")]
    category: TicketCategory
    priority: TicketPriority = "normal"
    email: Email
    message: Annotated[
        str, trimmed(4000), min_chars(20, "Describe the issue in a little more detail (20+ characters)")
    ]
    # file names only: attachments are sent by email once the team replies (no file storage here)
    attachments: list[Annotated[str, trimmed(200)]] = Field(default_factory=list, max_length=3)


class TicketMessage(ApiModel):
    id: str
    from_: Literal["author", "support"] = Field(alias="from")
    name: str
    body: str
    at: datetime


class Ticket(ApiModel):
    id: str
    subject: str
    category: TicketCategory
    priority: TicketPriority
    status: TicketStatus
    created_at: datetime
    updated_at: datetime
    email: str
    attachments: list[str]
    messages: list[TicketMessage]


class ReplyIn(ApiModel):
    body: Annotated[str, trimmed(4000), min_chars(2, "Write a reply")]


class StatusIn(ApiModel):
    status: TicketStatus


class ContactIn(ApiModel):
    name: Name
    email: Email
    phone: OptionalPhone = ""
    topic: ContactTopic
    message: Annotated[str, trimmed(2000), min_chars(20, "Tell us a little more (20+ characters)")]


class Reference(ApiModel):
    id: str


class ConsultationIn(ApiModel):
    name: Name
    email: Email
    phone: Phone
    date: Date
    slot: str = Field(max_length=5)
    topic: Annotated[str, trimmed(200)] = ""


class Slots(ApiModel):
    date: str
    slots: list[str]  # still free, in IST
