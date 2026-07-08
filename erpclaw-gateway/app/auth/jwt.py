"""JWT verification and RBAC for the gateway.

No external IdP in this slice: tokens are signed HS256 against a pre-shared
``JWT_SECRET``. ``_get_signing_key()`` is the seam a later JWKS-based verifier
plugs into without touching the route dependencies.

Authorization is two layers:
  1. ``require_invoke_scope`` — a valid token carrying the fixed
     ``JWT_REQUIRED_SCOPE`` (default ``erpclaw:invoke``). This is "is this
     caller allowed to hit the invoke surface at all" — unchanged from v1.
  2. ``authorize_action`` — real per-action RBAC on top of that, driven by a
     ``role`` claim on the token and the catalog's own ``kind``
     (query/report/mutation) and ``destructive`` metadata (the same metadata
     ``mcp/confirm.py``'s destructive-action gate is built from), so the
     policy can never disagree with what the router itself considers
     destructive.
"""
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt as _jose_jwt

from app.config import settings

_bearer = HTTPBearer(auto_error=True)

# Role -> action "kind"s (see catalog/cache.py's _classify()) that role may
# invoke. Destructive actions are gated separately (_ROLES_ALLOWING_DESTRUCTIVE)
# regardless of kind, since a destructive action can be a "mutation" of any kind.
_ROLE_ALLOWED_KINDS: dict[str, frozenset[str]] = {
    "readonly": frozenset({"query", "report"}),
    "operator": frozenset({"query", "report", "mutation"}),
    "admin": frozenset({"query", "report", "mutation"}),
}
_ROLES_ALLOWING_DESTRUCTIVE: frozenset[str] = frozenset({"admin"})
_DEFAULT_ROLE = "readonly"


@dataclass(frozen=True)
class Principal:
    subject: str
    scopes: frozenset[str]
    role: str


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
    role = payload.get("role") or _DEFAULT_ROLE
    if role not in _ROLE_ALLOWED_KINDS:
        role = _DEFAULT_ROLE
    return Principal(subject=subject, scopes=scopes, role=role)


def require_invoke_scope(principal: Principal = Depends(verify_token)) -> Principal:
    """Dependency for /api/v1/actions/*: valid token + the fixed invoke scope.

    This is the coarse "may invoke at all" gate; authorize_action() below is
    the fine-grained per-action/per-role check layered on top of it.
    """
    if settings.jwt_required_scope not in principal.scopes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Token missing required scope '{settings.jwt_required_scope}'."
            ),
        )
    return principal


def authorize_action(principal: Principal, *, kind: str, destructive: bool) -> None:
    """Raises 403 if principal.role isn't permitted to invoke an action of
    this kind/destructiveness. Call after require_invoke_scope, once the
    catalog entry (or a fixed action's known kind) is in hand."""
    if destructive and principal.role not in _ROLES_ALLOWING_DESTRUCTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{principal.role}' may not invoke destructive actions.",
        )
    if kind not in _ROLE_ALLOWED_KINDS.get(principal.role, frozenset()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{principal.role}' may not invoke '{kind}' actions.",
        )
