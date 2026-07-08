"""Mint a test HS256 JWT for local curl/Postman verification.

Usage:
    python -m app.auth.mint_test_token --sub tester --scope erpclaw:invoke --role admin [--expires-hours 24]

Signs against the same JWT_SECRET the gateway verifies with (env var,
defaults to the dev-only placeholder in app.config). Prints only the raw
token to stdout so it's directly usable in `TOKEN=$(python -m ...)`.
"""
import argparse
import time

from jose import jwt as _jose_jwt

from app.config import settings


def main() -> None:
    parser = argparse.ArgumentParser(description="Mint a test JWT for the erpclaw gateway")
    parser.add_argument("--sub", default="tester", help="Subject claim")
    parser.add_argument(
        "--scope", default=settings.jwt_required_scope,
        help="Space-separated scope string (default: the gateway's required scope)",
    )
    parser.add_argument(
        "--role", default="admin", choices=["readonly", "operator", "admin"],
        help="Role claim, drives per-action RBAC (default: admin)",
    )
    parser.add_argument("--expires-hours", type=float, default=24.0)
    args = parser.parse_args()

    now = int(time.time())
    payload = {
        "sub": args.sub,
        "scope": args.scope,
        "role": args.role,
        "iat": now,
        "exp": now + int(args.expires_hours * 3600),
    }
    token = _jose_jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    print(token)


if __name__ == "__main__":
    main()
