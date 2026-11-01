from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status

from app.core.auth import CurrentUser, OptionalUser
from app.core.deps import DbDep
from app.core.rate_limit import limit
from app.modules.support.consultations import Consultations
from app.modules.support.schemas import (
    ConsultationIn,
    ContactIn,
    Date,
    Reference,
    ReplyIn,
    Slots,
    StatusIn,
    Ticket,
    TicketIn,
)
from app.modules.support.service import SupportService

router = APIRouter(prefix="/support", tags=["support"])

TicketId = Annotated[str, Path(pattern=r"^TKT-[A-Z0-9]{8}$")]


def get_service(db: DbDep) -> SupportService:
    return SupportService(db)


Service = Annotated[SupportService, Depends(get_service)]


@router.post(
    "/tickets",
    dependencies=[limit("forms", 10, 600)],
    response_model=Ticket,
    status_code=status.HTTP_201_CREATED,
)
async def create_ticket(body: TicketIn, user: CurrentUser, service: Service) -> Ticket:
    return await service.create_ticket(user, body)


@router.get("/tickets", response_model=list[Ticket], summary="My tickets (admins: everyone's, with all=true)")
async def list_tickets(
    user: CurrentUser, service: Service, everyone: Annotated[bool, Query(alias="all")] = False
) -> list[Ticket]:
    return await service.list_tickets(user, everyone=everyone)


@router.get("/tickets/{ticket_id}", response_model=Ticket)
async def get_ticket(ticket_id: TicketId, user: CurrentUser, service: Service) -> Ticket:
    return await service.get_ticket(user, ticket_id)


@router.post("/tickets/{ticket_id}/replies", dependencies=[limit("forms", 30, 600)], response_model=Ticket)
async def reply(ticket_id: TicketId, body: ReplyIn, user: CurrentUser, service: Service) -> Ticket:
    return await service.reply(user, ticket_id, body.body)


@router.put("/tickets/{ticket_id}/status", response_model=Ticket)
async def set_status(ticket_id: TicketId, body: StatusIn, user: CurrentUser, service: Service) -> Ticket:
    return await service.set_status(user, ticket_id, body.status)


@router.post(
    "/contact",
    dependencies=[limit("forms", 10, 600)],
    response_model=Reference,
    status_code=status.HTTP_201_CREATED,
)
async def contact(body: ContactIn, service: Service, user: OptionalUser) -> Reference:
    return Reference(id=await service.send_contact(body, user))


@router.get("/consultations/slots", response_model=Slots, summary="Free call slots on a date (IST)")
async def slots(date: Annotated[Date, Query()], db: DbDep) -> Slots:
    return Slots(date=date, slots=await Consultations(db).slots(date))


@router.post(
    "/consultations",
    dependencies=[limit("forms", 10, 600)],
    response_model=Reference,
    status_code=status.HTTP_201_CREATED,
)
async def book(body: ConsultationIn, db: DbDep, user: OptionalUser) -> Reference:
    details = body.model_dump(exclude={"date", "slot"}) | {
        "source": "consultation",
        "user_id": user.id if user else None,
    }
    return Reference(id=await Consultations(db).book(date=body.date, slot=body.slot, details=details))
