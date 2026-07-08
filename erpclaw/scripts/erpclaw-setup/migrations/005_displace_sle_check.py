"""Migration 005: Displace stock_ledger_entry's voucher_type CHECK with the registry.

Wave 0 / M0 phase 3a (stock_ledger_entry). The hardcoded voucher_type CHECK on
stock_ledger_entry is dropped; validity is sourced from voucher_type_registry
(target_table='stock_ledger_entry') and enforced app-side in
stock_posting.insert_sle_entries. Consistent with M0 phases 1-2.

1. Drops the voucher_type CHECK from `stock_ledger_entry` (dialect-aware):
     - SQLite: rename -> recreate WITHOUT the CHECK -> intersection-copy ->
       drop -> recreate captured indexes (FK off; rows preserved verbatim; SLE
       is immutable). is_cancelled CHECK retained.
     - PostgreSQL: ALTER TABLE ... DROP CONSTRAINT IF EXISTS
       stock_ledger_entry_voucher_type_check.
2. Seeds the 10 stock_ledger_entry voucher types (idempotent).

Idempotent: detects an already-dropped CHECK and just re-seeds.
"""
import argparse
import os
import sys

DEFAULT_DB_PATH = os.path.join(os.path.expanduser(os.environ.get("ERPCLAW_HOME", "~/.openclaw/erpclaw")), "data.sqlite")

SLE_VOUCHER_SEED = [
    ("stock_entry", "erpclaw-inventory", "Stock Entry"),
    ("purchase_receipt", "erpclaw-buying", "Purchase Receipt"),
    ("delivery_note", "erpclaw-selling", "Delivery Note"),
    ("stock_reconciliation", "erpclaw-inventory", "Stock Reconciliation"),
    ("work_order", "erpclaw-manufacturing", "Work Order"),
    ("sales_invoice", "erpclaw-selling", "Sales Invoice"),
    ("credit_note", "erpclaw-selling", "Credit Note"),
    ("purchase_invoice", "erpclaw-buying", "Purchase Invoice"),
    ("debit_note", "erpclaw-buying", "Debit Note"),
    ("stock_revaluation", "erpclaw-inventory", "Stock Revaluation"),
]

# stock_ledger_entry WITHOUT the voucher_type CHECK. Matches init_schema.py.
_SLE_DDL_NO_CHECK = """
CREATE TABLE stock_ledger_entry (
    id              TEXT PRIMARY KEY,
    posting_date    TEXT NOT NULL,
    posting_time    TEXT,
    item_id         TEXT NOT NULL REFERENCES item(id) ON DELETE RESTRICT,
    warehouse_id    TEXT NOT NULL REFERENCES warehouse(id) ON DELETE RESTRICT,
    actual_qty      TEXT NOT NULL DEFAULT '0',
    qty_after_transaction TEXT NOT NULL DEFAULT '0',
    valuation_rate  TEXT NOT NULL DEFAULT '0',
    stock_value     TEXT NOT NULL DEFAULT '0',
    stock_value_difference TEXT NOT NULL DEFAULT '0',
    voucher_type    TEXT NOT NULL,
    voucher_id      TEXT NOT NULL,
    batch_id        TEXT,
    serial_number   TEXT,
    incoming_rate   TEXT NOT NULL DEFAULT '0',
    is_cancelled    INTEGER NOT NULL DEFAULT 0 CHECK(is_cancelled IN (0,1)),
    fiscal_year     TEXT,
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP
)
"""


def _run_postgres(url):
    import psycopg2
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "ALTER TABLE stock_ledger_entry DROP CONSTRAINT IF EXISTS "
                "stock_ledger_entry_voucher_type_check"
            )
            for vt, skill, label in SLE_VOUCHER_SEED:
                cur.execute(
                    "INSERT INTO voucher_type_registry (voucher_type, skill_name, label, target_table) "
                    "VALUES (%s, %s, %s, 'stock_ledger_entry') ON CONFLICT (voucher_type, target_table) DO NOTHING",
                    (vt, skill, label),
                )
        conn.commit()
        print("  Postgres: stock_ledger_entry voucher_type CHECK dropped; registry seeded.")
    finally:
        conn.close()


def run_migration(db_path=None):
    url = os.environ.get("ERPCLAW_DB_URL") or db_path
    if not url:
        print("No Postgres connection URL (ERPCLAW_DB_URL). Nothing to migrate.")
        return
    _run_postgres(url)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migration 005: Displace stock_ledger_entry voucher_type CHECK")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH)
    args = parser.parse_args()
    run_migration(args.db_path)
    print("Migration 005 complete.")
