"""
One error envelope for every failure:

    {"error": {"code": "NOT_FOUND", "message": "…", "fields": {"email": "…"}}}

The codes mirror `ApiError` in the Next.js client (src/lib/api/client.ts), so
forms there can highlight field errors without knowing about FastAPI.
"""

import logging
from enum import StrEnum
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger(__name__)


class ErrorCode(StrEnum):
    VALIDATION = "VALIDATION"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    RATE_LIMITED = "RATE_LIMITED"
    AI_UNAVAILABLE = "AI_UNAVAILABLE"
    INTERNAL = "INTERNAL"


STATUS: dict[ErrorCode, int] = {
    ErrorCode.VALIDATION: 422,
    ErrorCode.UNAUTHORIZED: 401,
    ErrorCode.FORBIDDEN: 403,
    ErrorCode.NOT_FOUND: 404,
    ErrorCode.CONFLICT: 409,
    ErrorCode.RATE_LIMITED: 429,
    ErrorCode.AI_UNAVAILABLE: 503,
    ErrorCode.INTERNAL: 500,
}

_HTTP_TO_CODE = {status: code for code, status in STATUS.items()}


class AppError(Exception):
    """Raise from services; the handler turns it into the envelope with the right status."""

    def __init__(self, code: ErrorCode, message: str, fields: dict[str, str] | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.fields = fields


def ai_paused(exc: AppError) -> bool:
    """Every model resting, or the reader's daily allowance spent: degrade gracefully, don't fail."""
    return exc.code in (ErrorCode.AI_UNAVAILABLE, ErrorCode.RATE_LIMITED)


def error_body(code: ErrorCode, message: str, fields: dict[str, str] | None = None) -> dict[str, Any]:
    error: dict[str, Any] = {"code": code.value, "message": message}
    if fields:
        error["fields"] = fields
    return {"error": error}


def _field_errors(exc: RequestValidationError) -> dict[str, str]:
    """Pydantic locations like ("body", "author", "email") become "author.email"."""
    fields: dict[str, str] = {}
    for err in exc.errors():
        loc = [str(p) for p in err["loc"] if p not in ("body", "query", "path")]
        fields.setdefault(".".join(loc) or "request", str(err["msg"]).removeprefix("Value error, "))
    return fields


async def _app_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)
    retry = getattr(exc, "retry_after", None)  # rate limits say when to come back
    headers = {"Retry-After": str(retry)} if retry else None
    return JSONResponse(
        error_body(exc.code, exc.message, exc.fields), status_code=STATUS[exc.code], headers=headers
    )


async def _validation_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    body = error_body(ErrorCode.VALIDATION, "Please check the highlighted fields.", _field_errors(exc))
    return JSONResponse(body, status_code=422)


async def _http_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    code = _HTTP_TO_CODE.get(exc.status_code, ErrorCode.INTERNAL)
    return JSONResponse(error_body(code, str(exc.detail)), status_code=exc.status_code, headers=exc.headers)


async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
    log.exception("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(error_body(ErrorCode.INTERNAL, "Something went wrong on our side."), status_code=500)


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(StarletteHTTPException, _http_error)
    app.add_exception_handler(Exception, _unhandled)
