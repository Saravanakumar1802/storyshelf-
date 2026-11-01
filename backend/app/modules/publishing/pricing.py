"""
The publishing quote, worked out on the server so a request always carries the
real price. Mirrors src/data/plans.ts and src/lib/pricing.ts (prices exclude
GST); tests/unit/test_pricing.py checks both stay in step.
"""

from dataclasses import dataclass
from math import ceil
from typing import Literal

PlanId = Literal["kickstart", "levelUp", "pro"]
GST_RATE = 0.18
INCLUDED_PAGES = 350
EXTRA_PAGES_BLOCK = 100

PLAN_PRICES: dict[PlanId, tuple[str, int]] = {
    "kickstart": ("Kickstart", 19_999),
    "levelUp": ("Level-Up", 49_999),
    "pro": ("Pro", 99_999),
}


@dataclass(frozen=True)
class Addon:
    name: str
    price: int
    included_in: tuple[PlanId, ...] = ()


ADDONS: dict[str, Addon] = {
    "ebook": Addon("eBook edition", 2_999, ("levelUp", "pro")),
    "googlePlay": Addon("Google Play + EPUB", 1_999, ("levelUp", "pro")),
    "audiobook": Addon("Audiobook", 14_999, ("pro",)),
    "amazonPrime": Addon("Amazon Prime listing (1 month)", 3_999, ("pro",)),
    "amazonAPlus": Addon("Amazon A+ listing", 4_999, ("pro",)),
    "authorPage": Addon("Amazon Author Page", 1_499, ("pro",)),
    "videoPromo": Addon("Video promotion", 6_999, ("pro",)),
    "amazonSponsored": Addon("Amazon Sponsored ads (30 days)", 9_999, ("pro",)),
    "youtube": Addon("YouTube promotion", 2_499, ("levelUp", "pro")),
    "promoCode": Addon("StoryShelf store promo code (15 days)", 999, ("pro",)),
    "extraPages": Addon("Formatting beyond 350 pages", 2_499),
}


@dataclass(frozen=True)
class Quote:
    base: int
    addons: int
    subtotal: int
    gst: float
    total: float


def _round2(n: float) -> float:
    return round(n + 1e-9, 2)


def calc_quote(plan: PlanId, addon_ids: list[str], pages: int) -> Quote:
    """Add-ons already in the plan cost nothing; long books pay per extra 100 pages."""
    base = PLAN_PRICES[plan][1]
    chosen = set(addon_ids)
    extras = sum(
        a.price for k, a in ADDONS.items() if k != "extraPages" and k in chosen and plan not in a.included_in
    )
    blocks = ceil((pages - INCLUDED_PAGES) / EXTRA_PAGES_BLOCK) if pages > INCLUDED_PAGES else 0
    extras += ADDONS["extraPages"].price * blocks
    subtotal = base + extras
    gst = _round2(subtotal * GST_RATE)
    return Quote(base=base, addons=extras, subtotal=subtotal, gst=gst, total=_round2(subtotal + gst))
