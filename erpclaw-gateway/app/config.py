"""Gateway settings, env-driven. No dialect switch — Postgres-only by design."""
import os


class Settings:
    # Path to the merged erpclaw checkout this gateway dispatches into.
    # Defaults to the sibling ../erpclaw directory (Dynamic-ERP repo layout).
    erpclaw_repo_root: str = os.environ.get(
        "ERPCLAW_REPO_ROOT",
        os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "erpclaw")),
    )

    # ERPCLAW_HOME / ERPCLAW_DB_URL are read by the erpclaw subprocess itself
    # (via os.environ, forwarded verbatim by tool_router._resolve_env()) — the
    # gateway does not need to parse them, just ensure they're set in its own
    # environment before it starts (docker-compose / systemd unit's job).
    erpclaw_db_url: str | None = os.environ.get("ERPCLAW_DB_URL")

    jwt_secret: str = os.environ.get("JWT_SECRET", "dev-only-change-me")
    jwt_algorithm: str = "HS256"
    jwt_required_scope: str = os.environ.get("JWT_REQUIRED_SCOPE", "erpclaw:invoke")

    action_subprocess_timeout_s: float = float(os.environ.get("ERPCLAW_ACTION_TIMEOUT_S", "30"))


settings = Settings()
