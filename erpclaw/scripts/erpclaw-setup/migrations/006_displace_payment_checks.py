"""Migration 006: Displace payment-table party_type/voucher_type CHECKs with registries.

Wave 0 / M0 phase 3b. Drops the registry-backed CHECKs on the three payment
tables; validity is sourced from party_type_registry / voucher_type_registry
(already seeded by init_db + migrations 001/004). Consistent with M0 phases 1-3a.

  - payment_entry.party_type CHECK        -> party_type_registry
  - payment_allocation.voucher_type CHECK -> voucher_type_registry(target_table='payment_allocation')
  - payment_ledger_entry.party_type CHECK -> party_type_registry

KEPT as CHECKs (fundamental, non-extensible enums; no registry): payment_entry
.payment_type ('receive'/'pay'/'internal_transfer'), .status, and the delinked
boolean.

Dialect-aware + idempotent. SQLite: per-table rename -> recreate-without-the-CHECK
-> intersection-copy -> drop -> recreate captured indexes (FK off; rows preserved
verbatim). payment_entry's payment_method column (added by migration 001) is
preserved by the intersection-copy and is in the base DDL here. PostgreSQL: ALTER
TABLE ... DROP CONSTRAINT IF EXISTS for each.

Enforcement note: party_type for payments is user-input, validated at the
add-payment / create-payment-ledger-entry entry points against the registry
(erpclaw-payments _party_type_registered). payment_allocation.voucher_type and the
selling-side payment_ledger_entry party_type are system-derived from real
invoices/parties, so they are inherently typed — no per-insert re-validation added.
"""
import argparse
import os
import sys

DEFAULT_DB_PATH = os.path.join(os.path.expanduser(os.environ.get("ERPCLAW_HOME", "~/.openclaw/erpclaw")), "data.sqlite")

# (table, check_marker_to_detect, new_ddl_without_that_check, pg_constraint_name)
_TABLES = [
    ("payment_entry", "party_type IN", """
CREATE TABLE payment_entry (
    id              TEXT PRIMARY KEY,
    naming_series   TEXT,
    payment_type    TEXT NOT NULL CHECK(payment_type IN ('receive','pay','internal_transfer')),
    posting_date    TEXT NOT NULL,
    party_type      TEXT,
    party_id        TEXT,
    paid_from_account TEXT NOT NULL REFERENCES account(id) ON DELETE RESTRICT,
    paid_to_account TEXT NOT NULL REFERENCES account(id) ON DELETE RESTRICT,
    paid_amount     TEXT NOT NULL DEFAULT '0',
    received_amount TEXT NOT NULL DEFAULT '0',
    payment_currency TEXT NOT NULL DEFAULT 'USD',
    exchange_rate   TEXT NOT NULL DEFAULT '1',
    reference_number TEXT,
    reference_date  TEXT,
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK(status IN ('draft','submitted','cancelled')),
    unallocated_amount TEXT NOT NULL DEFAULT '0',
    company_id      TEXT NOT NULL REFERENCES company(id) ON DELETE RESTRICT,
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    payment_method  TEXT DEFAULT ''
)
""", "payment_entry_party_type_check"),
    ("payment_allocation", "voucher_type IN", """
CREATE TABLE payment_allocation (
    id              TEXT PRIMARY KEY,
    payment_entry_id TEXT NOT NULL REFERENCES payment_entry(id) ON DELETE RESTRICT,
    voucher_type    TEXT NOT NULL,
    voucher_id      TEXT NOT NULL,
    allocated_amount TEXT NOT NULL DEFAULT '0',
    exchange_gain_loss TEXT NOT NULL DEFAULT '0',
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP
)
""", "payment_allocation_voucher_type_check"),
    ("payment_ledger_entry", "party_type IN", """
CREATE TABLE payment_ledger_entry (
    id              TEXT PRIMARY KEY,
    posting_date    TEXT NOT NULL,
    account_id      TEXT NOT NULL REFERENCES account(id) ON DELETE RESTRICT,
    party_type      TEXT NOT NULL,
    party_id        TEXT NOT NULL,
    voucher_type    TEXT NOT NULL,
    voucher_id      TEXT NOT NULL,
    against_voucher_type TEXT,
    against_voucher_id   TEXT,
    amount          TEXT NOT NULL DEFAULT '0',
    amount_in_account_currency TEXT NOT NULL DEFAULT '0',
    currency        TEXT NOT NULL DEFAULT 'USD',
    delinked        INTEGER NOT NULL DEFAULT 0 CHECK(delinked IN (0,1)),
    remarks         TEXT,
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT DEFAULT CURRENT_TIMESTAMP
)
""", "payment_ledger_entry_party_type_check"),
]


def _run_postgres(url):
    import psycopg2
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            for _table, _marker, _ddl, pg_constraint in _TABLES:
                cur.execute(f"ALTER TABLE {_table} DROP CONSTRAINT IF EXISTS {pg_constraint}")
        conn.commit()
        print("  Postgres: payment-table party_type/voucher_type CHECKs dropped.")
    finally:
        conn.close()


def run_migration(db_path=None):
    url = os.environ.get("ERPCLAW_DB_URL") or db_path
    if not url:
        print("No Postgres connection URL (ERPCLAW_DB_URL). Nothing to migrate.")
        return
    _run_postgres(url)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migration 006: Displace payment-table CHECKs")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH)
    args = parser.parse_args()
    run_migration(args.db_path)
    print("Migration 006 complete.")
