from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.auth.jwt import Principal, authorize_action


def _principal(role: str) -> Principal:
    return Principal(subject="tester", scopes=frozenset({"erpclaw:invoke"}), role=role)


def test_readonly_may_query():
    authorize_action(_principal("readonly"), kind="query", destructive=False)


def test_readonly_may_not_mutate():
    with pytest.raises(HTTPException) as exc:
        authorize_action(_principal("readonly"), kind="mutation", destructive=False)
    assert exc.value.status_code == 403


def test_operator_may_mutate_non_destructive():
    authorize_action(_principal("operator"), kind="mutation", destructive=False)


def test_operator_may_not_do_destructive_mutation():
    with pytest.raises(HTTPException) as exc:
        authorize_action(_principal("operator"), kind="mutation", destructive=True)
    assert exc.value.status_code == 403


def test_admin_may_do_destructive_mutation():
    authorize_action(_principal("admin"), kind="mutation", destructive=True)


def test_unknown_role_claim_falls_back_to_readonly(monkeypatch):
    from app.auth import jwt as jwt_module

    monkeypatch.setattr(
        jwt_module, "_jose_jwt", MagicMock(decode=lambda *a, **k: {"sub": "x", "scope": "erpclaw:invoke", "role": "superuser"})
    )
    creds = MagicMock(credentials="irrelevant-with-mocked-decode")
    principal = jwt_module.verify_token(creds)
    assert principal.role == "readonly"


def test_actions_route_enforces_rbac_for_destructive_action(monkeypatch, auth_headers):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.catalog import cache as catalog_cache
    from app.erpclaw_bridge import loader as bridge_loader

    monkeypatch.setattr(
        catalog_cache, "find_action",
        lambda domain, action: {"name": action, "domain": domain, "kind": "mutation", "destructive": True},
    )
    fake_confirm = MagicMock()
    fake_confirm.is_credential_carved_out.return_value = False
    fake_router = MagicMock()
    fake_router.dispatch.return_value = {"status": "ok"}
    monkeypatch.setattr(bridge_loader, "confirm", lambda: fake_confirm)
    monkeypatch.setattr(bridge_loader, "tool_router", lambda: fake_router)

    client = TestClient(app)
    readonly_token = _make_readonly_token()
    resp = client.post(
        "/api/v1/actions/gl/close-fiscal-year",
        json={"args": {}, "user_confirmed": True},
        headers={"Authorization": f"Bearer {readonly_token}"},
    )
    assert resp.status_code == 403

    admin_resp = client.post(
        "/api/v1/actions/gl/close-fiscal-year",
        json={"args": {}, "user_confirmed": True},
        headers=auth_headers,
    )
    assert admin_resp.status_code == 200


def _make_readonly_token() -> str:
    from tests.conftest import make_token

    return make_token(role="readonly")
