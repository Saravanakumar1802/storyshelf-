import re
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.modules.users.schemas import UserPublic

# Same rules as signupSchema in src/lib/schemas (the Next.js forms)
_LETTER = re.compile(r"[A-Za-z]")
_DIGIT = re.compile(r"\d")


class SignupIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    # readers join the library; authors come in through the publishing flow. Admins are never self-made.
    role: Literal["reader", "author"] = "reader"

    @field_validator("name")
    @classmethod
    def _trim(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Please enter your full name")
        return v

    @field_validator("password")
    @classmethod
    def _strength(cls, v: str) -> str:
        if not (_LETTER.search(v) and _DIGIT.search(v)):
            raise ValueError("Use at least one letter and one number")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshIn(BaseModel):
    refresh_token: str = Field(alias="refreshToken", min_length=20, max_length=200)


class Session(BaseModel):
    """What sign-in, sign-up and refresh return."""

    access_token: str = Field(serialization_alias="accessToken")
    refresh_token: str = Field(serialization_alias="refreshToken")
    expires_in: int = Field(serialization_alias="expiresIn", description="Access-token lifetime in seconds")
    user: UserPublic
