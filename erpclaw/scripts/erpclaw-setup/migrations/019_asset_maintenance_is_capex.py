"""Migration 019: M7 asset depth — asset_maintenance.is_capex column + backfill.

Adds the capex-vs-opex flag to asset_maintenance. When is_capex=1,
complete-maintenance capitalizes the maintenance cost into the asset
(DR Asset / CR Cash) and recomputes the depreciation schedule; when 0 it posts
the cost as a repair expense (DR Repair / CR Cash). Existing rows pre-date the
distinction and are repairs, so they are backfilled to 0 (opex).

The column is added NOT NULL DEFAULT 0 (so the ADD COLUMN itself sets every
existing row to 0); the explicit UPDATE is a belt-and-braces backfill that also
covers any row a prior partial run left NULL. Plain ADD COLUMN (no rebuild).
Idempotent. Dialect-aware. Pairs with migration 018.
"""
import argparse
import os

DEFAULT_DB_PATH = os.path.join(os.path.expanduser(os.environ.get("ERPCLAW_HOME", "~/.openclaw/erpclaw")), "data.sqlite")

_TABLE = "asset_maintenance"
_COLUMN = "is_capex"
# Fully-literal SQL (table + column are fixed constants — no interpolation, so no
# injection surface and no f-string scanner flag). DDL matches init_schema exactly.
_SQLITE_ADD = "ALTER TABLE asset_maintenance ADD COLUMN is_capex INTEGER NOT NULL DEFAULT 0 CHECK(is_capex IN (0,1))"
_PG_ADD = "ALTER TABLE asset_maintenance ADD COLUMN IF NOT EXISTS is_capex INTEGER NOT NULL DEFAULT 0 CHECK(is_capex IN (0,1))"
_BACKFILL = "UPDATE asset_maintenance SET is_capex = 0 WHERE is_capex IS NULL"


def _run_postgres(url):
    import psycopg2
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            cur.execute(_PG_ADD)
            print(f"  Postgres: {_TABLE}.{_COLUMN} ensured.")
            cur.execute(_BACKFILL)
            print(f"  Postgres: {_TABLE}.{_COLUMN} backfilled {cur.rowcount} NULL row(s) to 0.")
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
    parser = argparse.ArgumentParser(description="Migration 019: asset_maintenance.is_capex")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH)
    args = parser.parse_args()
    run_migration(args.db_path)
    print("Migration 019 complete.")
