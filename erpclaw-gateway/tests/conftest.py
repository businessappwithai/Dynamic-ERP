import os
import time

os.environ.setdefault("JWT_SECRET", "test-secret-for-pytest")

import pytest  # noqa: E402
from jose import jwt as _jose_jwt  # noqa: E402

from app.config import settings  # noqa: E402


def make_token(scope: str = "erpclaw:invoke", sub: str = "tester", role: str = "admin") -> str:
    now = int(time.time())
    payload = {"sub": sub, "scope": scope, "role": role, "iat": now, "exp": now + 3600}
    return _jose_jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


@pytest.fixture
def auth_headers():
    return {"Authorization": f"Bearer {make_token()}"}


@pytest.fixture
def readonly_auth_headers():
    return {"Authorization": f"Bearer {make_token(role='readonly')}"}


@pytest.fixture
def operator_auth_headers():
    return {"Authorization": f"Bearer {make_token(role='operator')}"}
