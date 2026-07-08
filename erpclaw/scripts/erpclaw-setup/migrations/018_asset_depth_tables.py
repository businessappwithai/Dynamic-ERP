"""Migration 018: M7 asset depth — asset_impairment + asset_capitalization tables.

Creates the two new asset-depth tables (impairment + initial-recognition
capitalization) and brings the registries up to parity with the M7 base DDL:
the four new gl_entry voucher types (asset_impairment, asset_capitalization,
asset_revaluation, asset_repair_capex) and the two asset statuses M7/S3 use
(impaired, under_construction). Both tables are submit-only / immutable
(no updated_at) — cancel = reverse via a mirror row, per the coding rules.

Pure CREATE TABLE / CREATE INDEX IF NOT EXISTS + existence-guarded seed INSERTs.
Idempotent, dialect-aware, no rebuild / no FK-rewrite trap. Columns match
init_schema exactly. Pairs with migration 019 (asset_maintenance.is_capex).
"""
import argparse
import os
import uuid

DEFAULT_DB_PATH = os.path.join(os.path.expanduser(os.environ.get("ERPCLAW_HOME", "~/.openclaw/erpclaw")), "data.sqlite")

_DDL = [
    """CREATE TABLE IF NOT EXISTS asset_impairment (
        id                  TEXT PRIMARY KEY,
        asset_id            TEXT NOT NULL REFERENCES asset(id) ON DELETE RESTRICT,
        impairment_date     TEXT NOT NULL,
        impairment_amount   TEXT NOT NULL DEFAULT '0',
        recoverable_amount  TEXT NOT NULL DEFAULT '0',
        book_value_before   TEXT NOT NULL DEFAULT '0',
        reason              TEXT,
        status              TEXT NOT NULL DEFAULT 'submitted'
                            CHECK(status IN ('submitted','reversed')),
        reversed_by_id      TEXT REFERENCES asset_impairment(id) ON DELETE RESTRICT,
        posted_by_user_id   TEXT,
        gl_entry_id         TEXT,
        created_at          TEXT DEFAULT CURRENT_TIMESTAMP
    )""",
    "CREATE INDEX IF NOT EXISTS idx_asset_impairment_asset ON asset_impairment(asset_id)",
    "CREATE INDEX IF NOT EXISTS idx_asset_impairment_status ON asset_impairment(status)",
    """CREATE TABLE IF NOT EXISTS asset_capitalization (
        id                  TEXT PRIMARY KEY,
        asset_id            TEXT NOT NULL REFERENCES asset(id) ON DELETE RESTRICT,
        purchase_invoice_id TEXT,
        cwip_source_id      TEXT,
        capitalized_amount  TEXT NOT NULL DEFAULT '0',
        capitalization_date TEXT NOT NULL,
        source_account_id   TEXT REFERENCES account(id) ON DELETE RESTRICT,
        gl_entry_id         TEXT,
        created_at          TEXT DEFAULT CURRENT_TIMESTAMP
    )""",
    "CREATE INDEX IF NOT EXISTS idx_asset_capitalization_asset ON asset_capitalization(asset_id)",
    "CREATE INDEX IF NOT EXISTS idx_asset_capitalization_pi ON asset_capitalization(purchase_invoice_id)",
]

# (voucher_type, skill_name, label, target_table) — all gl_entry.
_VOUCHER_SEED = [
    ("asset_impairment", "erpclaw-assets", "Asset Impairment", "gl_entry"),
    ("asset_capitalization", "erpclaw-assets", "Asset Capitalization", "gl_entry"),
    ("asset_revaluation", "erpclaw-assets", "Asset Revaluation", "gl_entry"),
    ("asset_repair_capex", "erpclaw-assets", "Asset Repair (Capex)", "gl_entry"),
]

# (status, skill_name, label) — M7 (impaired) + S3 CWIP (under_construction).
_STATUS_SEED = [
    ("impaired", "erpclaw-assets", "Impaired"),
    ("under_construction", "erpclaw-assets", "Under Construction"),
]


def _seed(execute):
    """Idempotently seed the M7 voucher types + statuses. ``execute(sql, params)``
    runs one statement; ``?`` placeholders work on SQLite and the Pg ``?``→``%s``
    wrapper."""
    for vt, skill, label, target in _VOUCHER_SEED:
        existing = execute(
            "SELECT 1 FROM voucher_type_registry WHERE voucher_type = ? AND target_table = ?",
            (vt, target),
        ).fetchone()
        if not existing:
            execute(
                "INSERT INTO voucher_type_registry (voucher_type, skill_name, label, target_table) "
                "VALUES (?, ?, ?, ?)",
                (vt, skill, label, target),
            )
    for st, skill, label in _STATUS_SEED:
        existing = execute(
            "SELECT 1 FROM asset_status_registry WHERE status = ?", (st,)
        ).fetchone()
        if not existing:
            execute(
                "INSERT INTO asset_status_registry (status, skill_name, label) "
                "VALUES (?, ?, ?)",
                (st, skill, label),
            )


def _run_postgres(url):
    import psycopg2
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            for stmt in _DDL:
                cur.execute(stmt)

            def _execute(sql, params=()):
                cur.execute(sql.replace("?", "%s"), params)
                return cur
            _seed(_execute)
        conn.commit()
        print("  Postgres: asset_impairment/asset_capitalization ensured (+ indexes, seeds).")
    finally:
        conn.close()


def run_migration(db_path=None):
    url = os.environ.get("ERPCLAW_DB_URL") or db_path
    if not url:
        print("No Postgres connection URL (ERPCLAW_DB_URL). Nothing to migrate.")
        return
    _run_postgres(url)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migration 018: M7 asset depth tables")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH)
    args = parser.parse_args()
    run_migration(args.db_path)
    print("Migration 018 complete.")
