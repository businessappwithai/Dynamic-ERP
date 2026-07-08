"""JWT verification for the gateway MVP.

No external IdP in this slice: tokens are signed HS256 against a pre-shared
``JWT_SECRET``. ``_get_signing_key()`` is the seam a later JWKS-based verifier
plugs into without touching the route dependencies.

v1 authorization is a single fixed scope check (``JWT_REQUIRED_SCOPE``, default
``erpclaw:invoke``) on every action-dispatch call — a deliberately cheap
placeholder for real per-action/per-role RBAC (explicitly deferred).
"""
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt as _jose_jwt

from app.config import settings

_bearer = HTTPBearer(auto_error=True)


@dataclass(frozen=True)
class Principal:
    subject: str
    scopes: frozenset[str]


def _get_signing_key() -> str:
    """Indirection so a future JWKS fetch-and-cache implementation can drop in
    without changing ``verify_token`` or any route dependency."""
    return settings.jwt_secret


def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> Principal:
    token = credentials.credentials
    try:
        payload = _jose_jwt.decode(
            token, _get_signing_key(), algorithms=[settings.jwt_algorithm]
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
        ) from exc

    subject = payload.get("sub", "")
    raw_scopes = payload.get("scope", payload.get("scopes", ""))
    if isinstance(raw_scopes, str):
        scopes = frozenset(raw_scopes.split())
    else:
        scopes = frozenset(raw_scopes or [])
    return Principal(subject=subject, scopes=scopes)


def require_invoke_scope(principal: Principal = Depends(verify_token)) -> Principal:
    """Dependency for /api/v1/actions/*: valid token + the fixed invoke scope."""
    if settings.jwt_required_scope not in principal.scopes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Token missing required scope '{settings.jwt_required_scope}'."
            ),
        )
    return principal
