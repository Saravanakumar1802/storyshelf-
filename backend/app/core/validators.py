"""
Field rules shared by the public forms. They mirror the zod schemas in
src/lib/schemas, so the site catches mistakes before sending and the API
rejects the same things with the same messages if a request skips the site.
"""

import re
from typing import Annotated

from pydantic import AfterValidator, EmailStr, StringConstraints

_PHONE = re.compile(r"^(\+?\d{1,3})?[6-9]\d{9}$")


def _phone(value: str) -> str:
    compact = re.sub(r"[\s()-]", "", value)
    if not _PHONE.match(compact):
        raise ValueError("Enter a valid 10-digit Indian mobile number")
    return compact


def _name(value: str) -> str:
    if len(value) < 2:
        raise ValueError("Please enter your full name")
    return value


def _lower(value: str) -> str:
    return value.lower()


Name = Annotated[str, StringConstraints(strip_whitespace=True, max_length=80), AfterValidator(_name)]
Email = Annotated[EmailStr, AfterValidator(_lower)]
Phone = Annotated[str, StringConstraints(strip_whitespace=True, max_length=20), AfterValidator(_phone)]
# optional on some forms: left blank is fine, filled in must be valid
OptionalPhone = Annotated[
    str, StringConstraints(strip_whitespace=True, max_length=20), AfterValidator(lambda v: v and _phone(v))
]


def min_chars(n: int, message: str) -> AfterValidator:
    """For trimmed free text: the site's wording when it is too short."""

    def check(value: str) -> str:
        if len(value) < n:
            raise ValueError(message)
        return value

    return AfterValidator(check)


def trimmed(max_length: int) -> StringConstraints:
    return StringConstraints(strip_whitespace=True, max_length=max_length)
