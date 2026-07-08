from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.main import app
from app.erpclaw_bridge import loader as bridge_loader

client = TestClient(app)


def test_provision_requires_auth():
    resp = client.post("/api/v1/modules/provision", json={"module_name": "healthclaw"})
    assert resp.status_code == 401


def test_provision_dispatches_install_module_via_tool_router(auth_headers, monkeypatch):
    fake_router = MagicMock()
    fake_router.dispatch.return_value = {"status": "ok", "action": "install-module"}
    monkeypatch.setattr(bridge_loader, "tool_router", lambda: fake_router)

    resp = client.post(
        "/api/v1/modules/provision",
        json={"module_name": "healthclaw", "user_confirmed": True},
        headers=auth_headers,
    )

    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "action": "install-module"}
    fake_router.dispatch.assert_called_once_with(
        "install-module", {"module_name": "healthclaw"}, True
    )


def test_provision_surfaces_confirmation_required_as_409(auth_headers, monkeypatch):
    fake_router = MagicMock()
    fake_router.dispatch.return_value = {
        "status": "confirmation_required",
        "action": "install-module",
    }
    monkeypatch.setattr(bridge_loader, "tool_router", lambda: fake_router)

    resp = client.post(
        "/api/v1/modules/provision",
        json={"module_name": "healthclaw"},
        headers=auth_headers,
    )

    assert resp.status_code == 409
