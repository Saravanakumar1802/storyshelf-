from datetime import timedelta

from app.core.config import Settings
from app.core.errors import AppError, ErrorCode
from app.core.security import create_access_token, hash_password, verify_password
from app.db.mongo import Database, Document
from app.modules.auth.repository import RefreshTokensRepository
from app.modules.auth.schemas import LoginIn, Session, SignupIn
from app.modules.users.repository import UsersRepository, to_public

_BAD_LOGIN = AppError(
    ErrorCode.UNAUTHORIZED,
    "That email and password don't match. Please try again.",
    {"password": "Incorrect email or password"},
)
_SESSION_ENDED = AppError(ErrorCode.UNAUTHORIZED, "Your session has ended. Please sign in again.")

# verifying against a real hash keeps failed logins for unknown emails as slow as wrong passwords
_DUMMY_HASH = hash_password("timing-equaliser-not-a-real-password-1")


class AuthService:
    def __init__(self, db: Database, settings: Settings) -> None:
        self.settings = settings
        self.users = UsersRepository(db)
        self.tokens = RefreshTokensRepository(db)

    async def signup(self, data: SignupIn) -> Session:
        user = await self.users.create(
            name=data.name,
            email=str(data.email),
            password_hash=hash_password(data.password),
            role=data.role,
            plan="kickstart" if data.role == "author" else None,
        )
        return await self._session(user)

    async def login(self, data: LoginIn) -> Session:
        user = await self.users.get_by_email(str(data.email))
        if user is None:
            verify_password(data.password, _DUMMY_HASH)
            raise _BAD_LOGIN
        if not verify_password(data.password, user["password_hash"]):
            raise _BAD_LOGIN
        return await self._session(user)

    async def refresh(self, refresh_token: str) -> Session:
        old = await self.tokens.consume(refresh_token)
        if old is None:
            raise _SESSION_ENDED
        user = await self.users.get_by_id(str(old["user_id"]))
        if user is None:
            raise _SESSION_ENDED
        return await self._session(user, family=old["family"])

    async def logout(self, refresh_token: str) -> None:
        old = await self.tokens.consume(refresh_token)
        if old is not None:
            await self.tokens.revoke_family(old["family"])

    async def _session(self, user: Document, family: str | None = None) -> Session:
        access, expires_in = create_access_token(self.settings, str(user["_id"]), user["role"])
        refresh = await self.tokens.issue(
            user["_id"], timedelta(days=self.settings.refresh_token_days), family
        )
        return Session(
            access_token=access, refresh_token=refresh, expires_in=expires_in, user=to_public(user)
        )
