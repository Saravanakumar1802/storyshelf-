"""Tickets, contact, consultations, publish requests, the author dashboard and the help assistant."""

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from httpx import AsyncClient

from app.db.mongo import Database
from app.modules.support.consultations import IST, SLOTS

pytestmark = pytest.mark.integration


def _weekday_ahead(days: int) -> str:
    d = datetime.now(UTC).astimezone(IST).date() + timedelta(days=days)
    while d.weekday() == 6:
        d += timedelta(days=1)
    return d.isoformat()


async def _reader(api: AsyncClient, email: str) -> dict[str, str]:
    body = {"name": "Ravi Reader", "email": email, "password": "reading4ever"}
    if (res := await api.post("/api/v1/auth/signup", json=body)).status_code != 201:
        res = await api.post("/api/v1/auth/login", json={"email": email, "password": body["password"]})
    return {"Authorization": f"Bearer {res.json()['accessToken']}"}


TICKET = {
    "subject": "Royalty statement question",
    "category": "Royalties & Payments",
    "priority": "normal",
    "email": "demo@storyshelf.in",
    "message": "My October statement shows fewer copies than my distributor report.",
    "attachments": ["statement.pdf"],
}


async def test_tickets_belong_to_their_owner(api: AsyncClient, demo_auth: dict[str, str]) -> None:
    assert (await api.post("/api/v1/support/tickets", json=TICKET)).status_code == 401
    created = await api.post("/api/v1/support/tickets", json=TICKET, headers=demo_auth)
    assert created.status_code == 201, created.text
    t = created.json()
    assert t["id"].startswith("TKT-") and t["status"] == "open"
    assert [m["from"] for m in t["messages"]] == ["author", "support"]

    replied = await api.post(
        f"/api/v1/support/tickets/{t['id']}/replies",
        json={"body": "Attaching the report."},
        headers=demo_auth,
    )
    assert replied.json()["status"] == "in-progress" and len(replied.json()["messages"]) == 3

    # someone else can't see it, and can't tell it exists
    stranger = await _reader(api, "ravi@storyshelf.in")
    assert (await api.get(f"/api/v1/support/tickets/{t['id']}", headers=stranger)).status_code == 404
    assert (await api.get("/api/v1/support/tickets", headers=stranger)).json() == []

    resolved = await api.put(
        f"/api/v1/support/tickets/{t['id']}/status", json={"status": "resolved"}, headers=demo_auth
    )
    assert resolved.json()["status"] == "resolved"
    late = await api.post(
        f"/api/v1/support/tickets/{t['id']}/replies", json={"body": "One more thing"}, headers=demo_auth
    )
    assert late.status_code == 409
    mine = (await api.get("/api/v1/support/tickets", headers=demo_auth)).json()
    assert mine[0]["id"] == t["id"]


async def test_ticket_validation_matches_the_site(api: AsyncClient, demo_auth: dict[str, str]) -> None:
    bad = {**TICKET, "subject": "Hi", "message": "short", "attachments": ["a", "b", "c", "d"]}
    res = await api.post("/api/v1/support/tickets", json=bad, headers=demo_auth)
    fields = res.json()["error"]["fields"]
    assert res.status_code == 422
    assert fields["subject"] == "Add a short subject (6+ characters)"
    assert "20+ characters" in fields["message"] and "attachments" in fields


async def test_contact_messages_need_no_account(api: AsyncClient, it_db: Database) -> None:
    body = {
        "name": "Asha Kumar",
        "email": "Asha@Example.com",
        "phone": "98450 12345",
        "topic": "Press & partnerships",
        "message": "We'd love to feature the AI library in our newsletter.",
    }
    res = await api.post("/api/v1/support/contact", json=body)
    assert res.status_code == 201
    saved = await it_db.contact_messages.find_one({"_id": res.json()["id"]})
    assert saved and saved["email"] == "asha@example.com" and saved["phone"] == "9845012345"
    bad = await api.post("/api/v1/support/contact", json={**body, "phone": "12345"})
    assert bad.json()["error"]["fields"]["phone"] == "Enter a valid 10-digit Indian mobile number"


async def test_a_slot_can_be_booked_once(api: AsyncClient) -> None:
    day = _weekday_ahead(3)
    free = (await api.get("/api/v1/support/consultations/slots", params={"date": day})).json()["slots"]
    assert free == SLOTS
    call = {
        "name": "Kiran Rao",
        "email": "kiran@example.com",
        "phone": "9845011111",
        "date": day,
        "slot": "15:00",
    }
    first = await api.post("/api/v1/support/consultations", json=call)
    assert first.status_code == 201 and first.json()["id"].startswith("CALL-")
    second = await api.post("/api/v1/support/consultations", json=call)
    assert second.status_code == 409 and second.json()["error"]["fields"]["slot"] == "No longer available"
    after = (await api.get("/api/v1/support/consultations/slots", params={"date": day})).json()["slots"]
    assert "15:00" not in after and len(after) == len(SLOTS) - 1


def _request(day: str, slot: str, **plan: Any) -> dict[str, Any]:
    return {
        "author": {
            "name": "Meera Varghese",
            "email": "demo@storyshelf.in",
            "phone": "9845022222",
            "city": "Kochi",
        },
        "manuscript": {
            "title": "The Pepper Road",
            "genre": "Historical",
            "language": "English",
            "stage": "final",
            "pages": 420,
        },
        "plan": plan or {"plan": "levelUp", "addons": ["ebook", "audiobook"]},
        "consultation": {"date": day, "slot": slot, "agree": True},
    }


async def test_a_publish_request_is_priced_on_the_server_and_books_the_call(
    api: AsyncClient, demo_auth: dict[str, str], admin_auth: dict[str, str]
) -> None:
    day = _weekday_ahead(4)
    res = await api.post("/api/v1/publish/requests", json=_request(day, "11:00"))
    assert res.status_code == 201, res.text
    req = res.json()
    # Level-Up 49,999 + audiobook 14,999 + one extra block of pages 2,499 (the eBook is included)
    assert req["quote"] == {
        "base": 49999,
        "addons": 17498,
        "subtotal": 67497,
        "gst": 12149.46,
        "total": 79646.46,
    }
    assert req["stage"] == "Consultation" and req["id"].startswith("PUB-")
    assert (await api.get(f"/api/v1/publish/requests/{req['id']}")).json()["id"] == req["id"]

    slots = (await api.get("/api/v1/support/consultations/slots", params={"date": day})).json()["slots"]
    assert "11:00" not in slots
    clash = await api.post("/api/v1/publish/requests", json=_request(day, "11:00"))
    assert clash.status_code == 409
    unknown = await api.post(
        "/api/v1/publish/requests", json=_request(day, "12:00", plan="pro", addons=["jetpack"])
    )
    assert unknown.status_code == 422

    # the dashboard follows the request (matched by email), and the team moves it along
    dash = (await api.get("/api/v1/dashboard", headers=demo_auth)).json()
    assert dash["inProduction"]["id"] == req["id"] and dash["inProduction"]["stage"] == "Consultation"
    assert dash["published"][0]["slug"] == "the-monsoon-ledger"
    assert len(dash["royalties"]) == 12 and dash["totals"]["payoutFrequency"] == "Quarterly"
    assert dash["totals"]["lifetimeRoyalty"] == sum(r["royalty"] for r in dash["royalties"])
    # the last quarter's royalties are due at the next payout
    assert 0 < dash["totals"]["balance"] < dash["totals"]["lifetimeRoyalty"]

    moved = await api.put(
        f"/api/v1/admin/publish-requests/{req['id']}/stage", json={"stageIndex": 2}, headers=admin_auth
    )
    assert moved.json()["stage"] == "Editing"
    dash = (await api.get("/api/v1/dashboard", headers=demo_auth)).json()
    assert dash["inProduction"]["nextStep"] == "Review your editor's notes"
    assert (
        await api.put(
            f"/api/v1/admin/publish-requests/{req['id']}/stage", json={"stageIndex": 2}, headers=demo_auth
        )
    ).status_code == 403


async def test_readers_have_no_publishing_dashboard(api: AsyncClient) -> None:
    reader = await _reader(api, "ravi@storyshelf.in")
    assert (await api.get("/api/v1/dashboard", headers=reader)).status_code == 403


async def test_the_help_assistant_answers_from_the_faqs(api: AsyncClient, ai_shelf: dict[str, Any]) -> None:
    ask = {"messages": [{"role": "user", "content": "how often are royalties paid"}]}
    res = await api.post("/api/v1/assistant/chat", json=ask)
    assert res.status_code == 200, res.text
    reply = res.json()
    assert reply["answer"].startswith("Pro pays quarterly") and reply["meta"]["task"] == "help"
    assert reply["sources"]
    # the model's made-up link key is dropped; the real one is kept
    assert [link["href"] for link in reply["links"]] == ["/support/guides/understanding-royalties"]
    empty = await api.post("/api/v1/assistant/chat", json={"messages": []})
    assert empty.status_code == 422
