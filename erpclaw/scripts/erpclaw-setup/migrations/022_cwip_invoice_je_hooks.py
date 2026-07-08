"""Migration 022: S3 CWIP invoice/JE hooks (AVA-43) — purchase_invoice.cwip_asset_id
and journal_entry.cwip_asset_id columns.

The S3 core (migration 021) shipped the cwip_cost_accumulation table + 5 actions.
This migration adds the remaining acceptance criterion: the --cwip-asset-id flag on
create-purchase-invoice / add-journal-entry. The flag is captured at create and
consumed at submit (where GL posts), so it must persist on the document — one
nullable column per table carries it.

Both columns are plain TEXT, no FK — mirroring asset.cwip_project_id (migration
021): the referenced asset is validated app-side (must be under_construction) by
the submit hook, not by a DB constraint. Columns match init_schema exactly.

Pure column-presence-guarded ADD COLUMN. Idempotent, dialect-aware, no rebuild /
no FK-rewrite trap. Pairs with migration 021 in the S3 sequence.
"""
import argparse
import os

DEFAULT_DB_PATH = os.path.join(os.path.expanduser(os.environ.get("ERPCLAW_HOME", "~/.openclaw/erpclaw")), "data.sqlite")

# (table, column) — each added as plain nullable TEXT (validated app-side).
_ADDITIONS = [
    ("purchase_invoice", "cwip_asset_id"),
    ("journal_entry", "cwip_asset_id"),
]
# Fully-literal SQL per table/column (no interpolation of untrusted input — the
# table/column names are fixed constants).
_SQLITE_ADD = {
    ("purchase_invoice", "cwip_asset_id"):
        "ALTER TABLE purchase_invoice ADD COLUMN cwip_asset_id TEXT",
    ("journal_entry", "cwip_asset_id"):
        "ALTER TABLE journal_entry ADD COLUMN cwip_asset_id TEXT",
}
_PG_ADD = {
    ("purchase_invoice", "cwip_asset_id"):
        "ALTER TABLE purchase_invoice ADD COLUMN IF NOT EXISTS cwip_asset_id TEXT",
    ("journal_entry", "cwip_asset_id"):
        "ALTER TABLE journal_entry ADD COLUMN IF NOT EXISTS cwip_asset_id TEXT",
}


def _run_postgres(url):
    import psycopg2
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            for table, column in _ADDITIONS:
                cur.execute(_PG_ADD[(table, column)])
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
    parser = argparse.ArgumentParser(description="Migration 022: S3 CWIP invoice/JE hooks")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH)
    args = parser.parse_args()
    run_migration(args.db_path)
    print("Migration 022 complete.")
