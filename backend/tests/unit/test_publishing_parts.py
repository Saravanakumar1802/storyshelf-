"""Quotes, consultation slots and payout dates: the arithmetic behind publishing."""

import re
from datetime import UTC, date, datetime

import pytest

from app.core.config import BACKEND_DIR
from app.modules.publishing.pricing import ADDONS, PLAN_PRICES, calc_quote
from app.modules.publishing.service import next_payout, previous_payout
from app.modules.support.consultations import IST, SLOTS, open_slots

PLANS_TS = BACKEND_DIR.parent / "src" / "data" / "plans.ts"


@pytest.mark.skipif(not PLANS_TS.exists(), reason="the site's source is not next to the backend")
def test_prices_match_the_site() -> None:
    """The site shows these prices; the server charges them. They must never drift apart."""
    ts = PLANS_TS.read_text(encoding="utf-8")
    site_plans = dict(re.findall(r'id: "(\w+)",\s*name: "[^"]+",\s*tagline: "[^"]*",\s*price: (\d+)', ts))
    assert {k: int(v) for k, v in site_plans.items()} == {k: p for k, (_, p) in PLAN_PRICES.items()}
    site_addons = {
        m[0]: (int(m[1]), tuple(re.findall(r'"(\w+)"', m[2])))
        for m in re.findall(r'\{ id: "(\w+)",.*?price: (\d+), includedIn: \[([^\]]*)\]', ts)
    }
    assert site_addons == {k: (a.price, a.included_in) for k, a in ADDONS.items()}


def test_quote_charges_only_what_the_plan_lacks() -> None:
    q = calc_quote("levelUp", ["ebook", "audiobook"], 300)  # the eBook is in Level-Up already
    assert (q.base, q.addons, q.subtotal) == (49_999, 14_999, 64_998)
    assert q.gst == 11_699.64 and q.total == 76_697.64


def test_long_books_pay_per_hundred_extra_pages() -> None:
    assert calc_quote("kickstart", [], 350).addons == 0
    assert calc_quote("kickstart", [], 351).addons == 2_499
    assert calc_quote("kickstart", [], 551).addons == 3 * 2_499


def _ist(*args: int) -> datetime:
    return datetime(*args, tzinfo=IST).astimezone(UTC)


def test_slots_need_an_hours_notice_and_skip_sundays_and_bookings() -> None:
    monday = "2026-11-02"
    assert open_slots(monday, set(), now=_ist(2026, 11, 1, 9, 0)) == SLOTS
    assert open_slots(monday, {"14:00"}, now=_ist(2026, 11, 2, 11, 15)) == SLOTS[4:]  # 12:00 is too soon
    assert open_slots("2026-11-01", set(), now=_ist(2026, 10, 30, 9, 0)) == []  # a Sunday
    assert open_slots("2026-10-30", set(), now=_ist(2026, 10, 31, 9, 0)) == []  # in the past
    assert open_slots("2027-06-01", set(), now=_ist(2026, 10, 31, 9, 0)) == []  # beyond the window
    assert open_slots("not-a-date", set()) == []


def test_payouts_are_quarterly_on_pro_and_annual_otherwise() -> None:
    assert next_payout(date(2026, 10, 31), quarterly=True) == date(2026, 12, 31)
    assert next_payout(date(2027, 1, 5), quarterly=True) == date(2027, 3, 31)
    assert next_payout(date(2026, 10, 31), quarterly=False) == date(2027, 3, 31)
    assert next_payout(date(2027, 3, 31), quarterly=False) == date(2027, 3, 31)
    assert previous_payout(date(2026, 12, 31), quarterly=True) == date(2026, 9, 30)
    assert previous_payout(date(2027, 3, 31), quarterly=True) == date(2026, 12, 31)
    assert previous_payout(date(2027, 3, 31), quarterly=False) == date(2026, 3, 31)
