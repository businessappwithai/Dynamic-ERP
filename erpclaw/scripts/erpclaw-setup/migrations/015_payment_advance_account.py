"""Migration 015: Add payment_entry.advance_account_id (Wave 0 / S2 phase 2).

When submit-payment routes the unallocated (advance) portion to a dedicated
advance liability/asset sub-account, the account is recorded here so
allocate-payment can post the offsetting reclassification. NULL = not routed
(legacy AR/AP-control behavior). Adds the column to existing DBs.

Plain ADD COLUMN (no rebuild). Idempotent. Dialect-aware.
"""
import argparse
import os

DEFAULT_DB_PATH = os.path.join(os.path.expanduser(os.environ.get("ERPCLAW_HOME", "~/.openclaw/erpclaw")), "data.sqlite")
_COLDEF = "TEXT REFERENCES account(id) ON DELETE RESTRICT"


def _run_postgres(url):
    import psycopg2
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            cur.execute(f"ALTER TABLE payment_entry ADD COLUMN IF NOT EXISTS advance_account_id {_COLDEF}")
        conn.commit()
        print("  Postgres: payment_entry.advance_account_id ensured.")
    finally:
        conn.close()


def run_migration(db_path=None):
    url = os.environ.get("ERPCLAW_DB_URL") or db_path
    if not url:
        print("No Postgres connection URL (ERPCLAW_DB_URL). Nothing to migrate.")
        return
    _run_postgres(url)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migration 015: payment_entry.advance_account_id")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH)
    args = parser.parse_args()
    run_migration(args.db_path)
    print("Migration 015 complete.")
