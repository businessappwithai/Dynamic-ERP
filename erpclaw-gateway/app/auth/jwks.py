"""JWKS fetch-and-cache for real external IdP verification.

Provider-agnostic: any IdP that publishes a standard JWKS document (Auth0,
Okta, Keycloak, Cognito, ...) works here — there's nothing vendor-specific,
just RFC 7517. ``JWKS_URL`` selects which one; the app never talks to a
specific IdP's proprietary API.

No new HTTP dependency: stdlib ``urllib.request`` is enough for one GET
against a JWKS endpoint (small, infrequent, cached).
"""
import json
import time
import urllib.error
import urllib.request

from fastapi import HTTPException, status

from app.config import settings

_cache: dict[str, dict] = {}  # kid -> JWK dict
_cache_fetched_at: float = 0.0


def _fetch_jwks_document(url: str) -> dict:
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:  # noqa: S310 - fixed, operator-configured URL
            return json.loads(resp.read())
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not fetch JWKS from {url!r}: {exc}",
        ) from exc


def _refresh_cache(url: str) -> None:
    global _cache_fetched_at
    document = _fetch_jwks_document(url)
    keys = document.get("keys", [])
    _cache.clear()
    for key in keys:
        kid = key.get("kid")
        if kid:
            _cache[kid] = key
    _cache_fetched_at = time.time()


def get_signing_key(kid: str | None, *, url: str) -> dict:
    """Returns the JWK matching ``kid``. Refetches once on a cache miss (the
    IdP may have rotated keys) before giving up — this is the only retry."""
    stale = (time.time() - _cache_fetched_at) > settings.jwks_cache_ttl_s
    if not _cache or stale:
        _refresh_cache(url)

    if kid is not None and kid in _cache:
        return _cache[kid]

    if kid is None and len(_cache) == 1:
        return next(iter(_cache.values()))

    # Cache miss: the IdP may have rotated its signing key since our last
    # fetch. Refetch once, then give up rather than looping forever.
    _refresh_cache(url)
    if kid is not None and kid in _cache:
        return _cache[kid]
    if kid is None and len(_cache) == 1:
        return next(iter(_cache.values()))

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=f"No JWKS key found for kid={kid!r}.",
    )


def _reset_cache_for_tests() -> None:
    """Test-only: clear the module-level cache between tests."""
    global _cache_fetched_at
    _cache.clear()
    _cache_fetched_at = 0.0
