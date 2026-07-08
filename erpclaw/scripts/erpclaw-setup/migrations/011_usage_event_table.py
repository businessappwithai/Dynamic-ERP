"""Migration 011: Create the usage_event table (BUG-007 fix).

erpclaw-billing `add-usage-event` / `add-usage-events-batch` write and read this
table, but it was never created in any schema. This adds it to existing DBs.
Columns match init_schema exactly. idempotency_key dedups re-sent events.

Pure CREATE TABLE / CREATE INDEX IF NOT EXISTS — idempotent, dialect-aware.
"""
import argparse
import os

DEFAULT_DB_PATH = os.path.join(os.path.expanduser(os.environ.get("ERPCLAW_HOME", "~/.openclaw/erpclaw")), "data.sqlite")

# Canonical (permissive) definition — matches init_schema and the prior
# erpclaw-growth definition verbatim so existing growth DBs are unaffected.
_DDL = [
    """CREATE TABLE IF NOT EXISTS usage_event (
        id                TEXT PRIMARY KEY,
        customer_id       TEXT,
        meter_id          TEXT,
        event_type        TEXT NOT NULL,
        quantity          TEXT NOT NULL DEFAULT '0',
        timestamp         TEXT NOT NULL,
        metadata          TEXT,
        idempotency_key   TEXT UNIQUE,
        billing_period_id TEXT,
        processed         INTEGER NOT NULL DEFAULT 0 CHECK(processed IN (0,1)),
        created_at        TEXT DEFAULT CURRENT_TIMESTAMP
    )""",
    "CREATE INDEX IF NOT EXISTS idx_usage_event_customer ON usage_event(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_usage_event_meter ON usage_event(meter_id)",
    "CREATE INDEX IF NOT EXISTS idx_usage_event_processed ON usage_event(processed)",
    "CREATE INDEX IF NOT EXISTS idx_usage_event_idempotency ON usage_event(idempotency_key)",
]


def _run_postgres(url):
    import psycopg2
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            for stmt in _DDL:
                cur.execute(stmt)
        conn.commit()
        print("  Postgres: usage_event ensured (+ indexes).")
    finally:
        conn.close()


def run_migration(db_path=None):
    url = os.environ.get("ERPCLAW_DB_URL") or db_path
    if not url:
        print("No Postgres connection URL (ERPCLAW_DB_URL). Nothing to migrate.")
        return
    _run_postgres(url)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migration 011: usage_event table")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH)
    args = parser.parse_args()
    run_migration(args.db_path)
    print("Migration 011 complete.")
