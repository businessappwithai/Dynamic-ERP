import time

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from jose import jwk as jose_jwk, jwt as jose_jwt

from app.auth import jwks


@pytest.fixture
def rsa_keypair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_jwk = jose_jwk.construct(pem, algorithm="RS256").to_dict()
    public_jwk["kid"] = "test-kid-1"
    public_jwk["use"] = "sig"
    return pem, public_jwk


@pytest.fixture(autouse=True)
def _reset_jwks_cache():
    jwks._reset_cache_for_tests()
    yield
    jwks._reset_cache_for_tests()


def test_get_signing_key_returns_matching_kid(monkeypatch, rsa_keypair):
    _pem, public_jwk = rsa_keypair
    monkeypatch.setattr(jwks, "_fetch_jwks_document", lambda url: {"keys": [public_jwk]})

    key = jwks.get_signing_key("test-kid-1", url="https://idp.example.com/.well-known/jwks.json")
    assert key["kid"] == "test-kid-1"


def test_get_signing_key_refetches_once_on_unknown_kid(monkeypatch, rsa_keypair):
    _pem, public_jwk = rsa_keypair
    call_count = {"n": 0}

    def fake_fetch(url):
        call_count["n"] += 1
        return {"keys": [public_jwk]}

    monkeypatch.setattr(jwks, "_fetch_jwks_document", fake_fetch)

    # Prime the cache with a stale kid, then ask for a different one (simulates
    # a rotated key the gateway hasn't seen yet) — should refetch once and find it.
    jwks._cache["old-kid"] = {"kid": "old-kid"}
    jwks._cache_fetched_at = time.time()

    key = jwks.get_signing_key("test-kid-1", url="https://idp.example.com/.well-known/jwks.json")
    assert key["kid"] == "test-kid-1"
    assert call_count["n"] == 1


def test_get_signing_key_raises_401_when_kid_never_found(monkeypatch, rsa_keypair):
    _pem, public_jwk = rsa_keypair
    monkeypatch.setattr(jwks, "_fetch_jwks_document", lambda url: {"keys": [public_jwk]})

    with pytest.raises(HTTPException) as exc:
        jwks.get_signing_key("nonexistent-kid", url="https://idp.example.com/.well-known/jwks.json")
    assert exc.value.status_code == 401


def test_end_to_end_rs256_token_verifies_via_jwks(monkeypatch, rsa_keypair):
    """Mints a real RS256 token, verifies it through verify_token() with
    JWKS_URL configured, end to end (no HS256 involved)."""
    pem, public_jwk = rsa_keypair
    monkeypatch.setattr(jwks, "_fetch_jwks_document", lambda url: {"keys": [public_jwk]})

    from app.auth import jwt as jwt_module

    monkeypatch.setattr(jwt_module.settings, "jwks_url", "https://idp.example.com/.well-known/jwks.json")
    monkeypatch.setattr(jwt_module.settings, "oidc_issuer", None)
    monkeypatch.setattr(jwt_module.settings, "oidc_audience", None)

    token = jose_jwt.encode(
        {"sub": "real-idp-user", "scope": "erpclaw:invoke", "role": "operator"},
        pem, algorithm="RS256", headers={"kid": "test-kid-1"},
    )

    class _Creds:
        credentials = token

    principal = jwt_module.verify_token(_Creds())
    assert principal.subject == "real-idp-user"
    assert principal.role == "operator"
    assert "erpclaw:invoke" in principal.scopes


def test_jwks_path_rejects_wrong_issuer(monkeypatch, rsa_keypair):
    pem, public_jwk = rsa_keypair
    monkeypatch.setattr(jwks, "_fetch_jwks_document", lambda url: {"keys": [public_jwk]})

    from app.auth import jwt as jwt_module

    monkeypatch.setattr(jwt_module.settings, "jwks_url", "https://idp.example.com/.well-known/jwks.json")
    monkeypatch.setattr(jwt_module.settings, "oidc_issuer", "https://idp.example.com/")
    monkeypatch.setattr(jwt_module.settings, "oidc_audience", None)

    token = jose_jwt.encode(
        {"sub": "u", "iss": "https://not-the-right-issuer.example.com/"},
        pem, algorithm="RS256", headers={"kid": "test-kid-1"},
    )

    class _Creds:
        credentials = token

    from fastapi import HTTPException as FastAPIHTTPException

    with pytest.raises(FastAPIHTTPException) as exc:
        jwt_module.verify_token(_Creds())
    assert exc.value.status_code == 401
