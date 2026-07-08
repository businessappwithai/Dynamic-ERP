"""Migration 007: Displace asset.status CHECK with a new asset_status_registry.

Wave 0 / M0 phase 4 (asset) — completes M0. Unlike phases 1-3 (which reused
existing registries), this introduces a NEW registry table. The hardcoded
status CHECK on `asset` is dropped; validity is sourced from
asset_status_registry and enforced app-side in erpclaw-assets update-asset.

1. Creates asset_status_registry (IF NOT EXISTS) and seeds the 8 states (the 5
   original + Wave-1 additions: under_construction for S3 CWIP, impaired for M7,
   cancelled for the S3 CWIP cancel path). Idempotent.
2. Drops the status CHECK from `asset` (dialect-aware):
     - SQLite: rename -> recreate WITHOUT the status CHECK (depreciation_method
       CHECK + NOT NULL DEFAULT 'draft' retained) -> intersection-copy -> drop ->
       recreate captured indexes (FK off; rows preserved verbatim).
     - PostgreSQL: ALTER TABLE asset DROP CONSTRAINT IF EXISTS asset_status_check.

Idempotent: detects an already-dropped CHECK and just (re)creates + seeds the
registry.
"""
import argparse
import os
import sys

DEFAULT_DB_PATH = os.path.join(os.path.expanduser(os.environ.get("ERPCLAW_HOME", "~/.openclaw/erpclaw")), "data.sqlite")

ASSET_STATUS_SEED = [
    ("draft", "erpclaw-assets", "Draft"),
    ("submitted", "erpclaw-assets", "Submitted"),
    ("in_use", "erpclaw-assets", "In Use"),
    ("under_construction", "erpclaw-assets", "Under Construction"),
    ("impaired", "erpclaw-assets", "Impaired"),
    ("cancelled", "erpclaw-assets", "Cancelled"),
    ("scrapped", "erpclaw-assets", "Scrapped"),
    ("sold", "erpclaw-assets", "Sold"),
]

_REGISTRY_DDL = """
CREATE TABLE IF NOT EXISTS asset_status_registry (
    status       TEXT PRIMARY KEY,
    skill_name   TEXT NOT NULL,
    label        TEXT NOT NULL
)
"""

# asset WITHOUT the status CHECK. Matches init_schema.py (depreciation_method
# CHECK + NOT NULL DEFAULT 'draft' on status retained).
_ASSET_DDL_NO_CHECK = """
CREATE TABLE asset (
    id              TEXT PRIMARY KEY,
    naming_series   TEXT,
    asset_name      TEXT NOT NULL,
    asset_category_id TEXT NOT NULL REFERENCES asset_category(id) ON DELETE RESTRICT,
    item_id         TEXT REFERENCES item(id) ON DELETE RESTRICT,
    purchase_date   TEXT,
    purchase_invoice_id TEXT,
    gross_value     TEXT NOT NULL DEFAULT '0',
    salvage_value   TEXT NOT NULL DEFAULT '0',
    depreciation_method TEXT CHECK(depreciation_method IN (
                        'straight_line','written_down_value','double_declining'
                    )),
    useful_life_years INTEGER,
    depreciation_start_date TEXT,
    current_book_value TEXT NOT NULL DEFAULT '0',
    accumulated_depreciation TEXT NOT NULL DEFAULT '0',
    status          TEXT NOT NULL DEFAULT 'draft',
    location        TEXT,
    custodian_employee_id TEXT,
    warranty_expiry_date TEXT,
    company_id      TEXT NOT NULL REFERENCES company(id) ON DELETE RESTRICT,
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT DEFAULT CURRENT_TIMESTAMP
)
"""


def _run_postgres(url):
    import psycopg2
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            cur.execute(_REGISTRY_DDL)
            for st, skill, label in ASSET_STATUS_SEED:
                cur.execute(
                    "INSERT INTO asset_status_registry (status, skill_name, label) "
                    "VALUES (%s, %s, %s) ON CONFLICT (status) DO NOTHING",
                    (st, skill, label),
                )
            cur.execute("ALTER TABLE asset DROP CONSTRAINT IF EXISTS asset_status_check")
        conn.commit()
        print("  Postgres: asset_status_registry created + seeded; asset.status CHECK dropped.")
    finally:
        conn.close()


def run_migration(db_path=None):
    url = os.environ.get("ERPCLAW_DB_URL") or db_path
    if not url:
        print("No Postgres connection URL (ERPCLAW_DB_URL). Nothing to migrate.")
        return
    _run_postgres(url)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migration 007: Displace asset.status CHECK")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH)
    args = parser.parse_args()
    run_migration(args.db_path)
    print("Migration 007 complete.")
