from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_events_requires_auth():
    resp = client.get("/api/v1/events")
    assert resp.status_code == 401
