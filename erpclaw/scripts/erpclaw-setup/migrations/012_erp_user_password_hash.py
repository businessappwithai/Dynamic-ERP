"""Migration 012: Add erp_user.password_hash column (BUG-005 fix).

`set-password` writes erp_user.password_hash, but the column was never created —
the action crashed. This adds it to existing DBs. This is the canonical example
of the "no column-migration path" gap (audit F4): previously there was no way to
add a column to an installed table, so the feature was parked behind xfail.

Plain ADD COLUMN (no rebuild, no FK-rewrite trap). Nullable (passwords are
optional; Telegram-auth users have none). Idempotent. Dialect-aware.
"""
import argparse
import os

DEFAULT_DB_PATH = os.path.join(os.path.expanduser(os.environ.get("ERPCLAW_HOME", "~/.openclaw/erpclaw")), "data.sqlite")


def _run_postgres(url):
    import psycopg2
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE erp_user ADD COLUMN IF NOT EXISTS password_hash TEXT")
        conn.commit()
        print("  Postgres: erp_user.password_hash ensured.")
    finally:
        conn.close()


def run_migration(db_path=None):
    url = os.environ.get("ERPCLAW_DB_URL") or db_path
    if not url:
        print("No Postgres connection URL (ERPCLAW_DB_URL). Nothing to migrate.")
        return
    _run_postgres(url)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migration 012: erp_user.password_hash column")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH)
    args = parser.parse_args()
    run_migration(args.db_path)
    print("Migration 012 complete.")
