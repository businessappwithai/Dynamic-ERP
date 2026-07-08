"""Migration 008: Add is_active to the type/status registries.

Wave 0 / M0 additive slice. The registry-CRUD `deactivate-*-type` actions soft-
disable a registered type by setting is_active=0; the enforcement reads
(add-account, gl_posting, stock_posting, add-payment, update-asset) require
is_active=1. This adds the column to existing DBs.

Plain ADD COLUMN (no table rebuild) — safe, and NOT subject to the
ALTER-TABLE-RENAME FK-rewrite trap (migrations 003-007). NOT NULL DEFAULT 1, so
existing rows become active. Idempotent. Dialect-aware.
"""
import argparse
import os

DEFAULT_DB_PATH = os.path.join(os.path.expanduser(os.environ.get("ERPCLAW_HOME", "~/.openclaw/erpclaw")), "data.sqlite")

_REGISTRIES = [
    "voucher_type_registry",
    "party_type_registry",
    "account_type_registry",
    "asset_status_registry",
]


def _run_postgres(url):
    import psycopg2
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            for t in _REGISTRIES:
                cur.execute(
                    f"ALTER TABLE {t} ADD COLUMN IF NOT EXISTS is_active "
                    f"INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1))"
                )
        conn.commit()
        print("  Postgres: is_active ensured on all four registries.")
    finally:
        conn.close()


def run_migration(db_path=None):
    url = os.environ.get("ERPCLAW_DB_URL") or db_path
    if not url:
        print("No Postgres connection URL (ERPCLAW_DB_URL). Nothing to migrate.")
        return
    _run_postgres(url)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migration 008: registry is_active column")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH)
    args = parser.parse_args()
    run_migration(args.db_path)
    print("Migration 008 complete.")
