"""Migration 014: Add company advance-account columns (Wave 0 / S2).

B1-style advance payments: when set, submit-payment routes the unallocated
advance leg to a dedicated "Advance from Customer" (liability) / "Advance to
Supplier" (asset) sub-account instead of the AR/AP control account. Nullable —
backward-compatible (unset = current behavior). Adds the columns to existing DBs.

Plain ADD COLUMN (no rebuild). Idempotent. Dialect-aware.
"""
import argparse
import os

DEFAULT_DB_PATH = os.path.join(os.path.expanduser(os.environ.get("ERPCLAW_HOME", "~/.openclaw/erpclaw")), "data.sqlite")

_COLUMNS = [
    ("advance_from_customer_account_id", "TEXT REFERENCES account(id) ON DELETE RESTRICT"),
    ("advance_to_supplier_account_id", "TEXT REFERENCES account(id) ON DELETE RESTRICT"),
]


def _run_postgres(url):
    import psycopg2
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            for col, coldef in _COLUMNS:
                cur.execute(f"ALTER TABLE company ADD COLUMN IF NOT EXISTS {col} {coldef}")
        conn.commit()
        print("  Postgres: company advance-account columns ensured.")
    finally:
        conn.close()


def run_migration(db_path=None):
    url = os.environ.get("ERPCLAW_DB_URL") or db_path
    if not url:
        print("No Postgres connection URL (ERPCLAW_DB_URL). Nothing to migrate.")
        return
    _run_postgres(url)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migration 014: company advance-account columns")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH)
    args = parser.parse_args()
    run_migration(args.db_path)
    print("Migration 014 complete.")
