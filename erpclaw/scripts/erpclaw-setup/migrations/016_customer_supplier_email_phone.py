"""Migration 016: Add email + phone columns to customer and supplier (FINDING-003).

customer and supplier carried only a generic free-text primary_contact line and
no structured email/phone. The gateway agent improvised JSON blobs into
primary_contact, breaking dunning's _resolve_customer_email and the import-*
INSERTs (which already name email/phone). This adds the four columns:

  - customer.email TEXT, customer.phone TEXT
  - supplier.email TEXT, supplier.phone TEXT

primary_contact is kept (distinct free-text purpose). Columns are nullable and
store verbatim (no format validation). Plain ADD COLUMN (no rebuild).
Idempotent. Dialect-aware.

ADR: ADR-0012 (customer/supplier email + phone columns).
"""
import argparse
import os

DEFAULT_DB_PATH = os.path.join(os.path.expanduser(os.environ.get("ERPCLAW_HOME", "~/.openclaw/erpclaw")), "data.sqlite")
_COLUMNS = [
    ("customer", "email"),
    ("customer", "phone"),
    ("supplier", "email"),
    ("supplier", "phone"),
]


def _run_postgres(url):
    import psycopg2
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            for table, column in _COLUMNS:
                cur.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} TEXT")
                print(f"  Postgres: {table}.{column} ensured.")
        conn.commit()
    finally:
        conn.close()


def run_migration(db_path=None):
    url = os.environ.get("ERPCLAW_DB_URL") or db_path
    if not url:
        print("No Postgres connection URL (ERPCLAW_DB_URL). Nothing to migrate.")
        return
    _run_postgres(url)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migration 016: customer/supplier email+phone")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH)
    args = parser.parse_args()
    run_migration(args.db_path)
    print("Migration 016 complete.")
