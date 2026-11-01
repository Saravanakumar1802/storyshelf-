from datetime import datetime
from typing import Annotated, Literal

from pydantic import Field, field_validator

from app.core.schemas import ApiModel
from app.core.validators import Email, Name, Phone, min_chars, trimmed
from app.modules.publishing.pricing import ADDONS, PlanId
from app.modules.support.schemas import Date

Genre = Literal[
    "Literary Fiction",
    "Essays",
    "Poetry",
    "Historical",
    "Short Stories",
    "Romance",
    "Science Fiction",
    "Thriller",
    "Nature",
    "Fantasy",
    "Memoir",
    "Other",
]
STAGES = [
    "Consultation",
    "Agreement",
    "Editing",
    "Cover & Interior",
    "ISBN & Proofs",
    "Distribution",
    "Marketing",
    "Royalties",
]
Stage = Literal[
    "Consultation",
    "Agreement",
    "Editing",
    "Cover & Interior",
    "ISBN & Proofs",
    "Distribution",
    "Marketing",
    "Royalties",
]
MAX_MANUSCRIPT_BYTES = 50 * 1024 * 1024


class AuthorIn(ApiModel):
    name: Name
    email: Email
    phone: Phone
    city: Annotated[str, trimmed(80), min_chars(2, "Enter your city")]
    bio: Annotated[str, trimmed(600)] | None = None


class ManuscriptIn(ApiModel):
    title: Annotated[str, trimmed(140), min_chars(1, "Enter a working title")]
    genre: Genre
    language: Annotated[str, trimmed(40), min_chars(2, "Enter the language")]
    stage: Literal["idea", "draft", "final"]
    pages: int = Field(ge=24, le=2000)
    # the file itself is sent to the consultant after the call; only its details travel here
    file_name: Annotated[str, trimmed(200)] | None = None
    file_size: int | None = Field(default=None, ge=0, le=MAX_MANUSCRIPT_BYTES)


class PlanIn(ApiModel):
    plan: PlanId
    addons: list[str] = Field(default_factory=list, max_length=len(ADDONS))

    @field_validator("addons")
    @classmethod
    def _known(cls, value: list[str]) -> list[str]:
        unknown = [a for a in value if a not in ADDONS]
        if unknown:
            raise ValueError(f"Unknown add-on: {', '.join(unknown)}")
        return list(dict.fromkeys(value))


class ConsultIn(ApiModel):
    date: Date
    slot: str = Field(max_length=5)
    agree: Literal[True]


class PublishIn(ApiModel):
    author: AuthorIn
    manuscript: ManuscriptIn
    plan: PlanIn
    consultation: ConsultIn


class QuoteOut(ApiModel):
    base: int
    addons: int
    subtotal: int
    gst: float
    total: float


class Consultation(ApiModel):
    date: str
    slot: str


class PublishRequest(ApiModel):
    id: str
    created_at: datetime
    author: AuthorIn
    manuscript: ManuscriptIn
    plan: PlanId
    addons: list[str]
    consultation: Consultation
    quote: QuoteOut
    stage: Stage
    stage_index: int


class StageIn(ApiModel):
    stage_index: int = Field(ge=0, le=len(STAGES) - 1)


# ── the author dashboard ──


class InProduction(ApiModel):
    id: str
    title: str
    stage: Stage
    stage_index: int
    next_step: str
    due: str


class PublishedTitle(ApiModel):
    slug: str  # a title in the site's showcase catalogue (src/data/showcaseBooks.ts)
    channels: list[str]
    copies_sold: int
    status: Literal["Live", "Reprinting"]


class RoyaltyMonth(ApiModel):
    month: str
    sales: int
    royalty: int


class Totals(ApiModel):
    lifetime_royalty: int
    copies: int
    next_payout: str
    payout_frequency: str
    balance: int


class Campaign(ApiModel):
    name: str
    status: Literal["Live", "Scheduled", "Completed", "Available as add-on"]
    metric: str


class TeamMember(ApiModel):
    role: str
    name: str
    email: str


class Dashboard(ApiModel):
    in_production: InProduction | None
    requests: list[PublishRequest]
    published: list[PublishedTitle]
    royalties: list[RoyaltyMonth]
    totals: Totals
    campaigns: list[Campaign]
    team: list[TeamMember]
