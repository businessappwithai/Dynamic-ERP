"""Migration 024: Displace the hardcoded opportunity.stage CHECK + add pipeline_stage_id (Wave 1B F3).

Per ADR-0023 (foundation FK columns for addon-owned entities),
foundation `opportunity` gains a nullable FK column `pipeline_stage_id` pointing at the
addon-owned `crm_pipeline_stage` table (owning addon: erpclaw-growth). The hardcoded
7-value `stage` CHECK is dropped so customizable pipelines can introduce novel stage
names; app-side `VALID_OPP_STAGES` (erpclaw-crm/db_query.py) remains the text-path
enforcement that replaces the CHECK on the legacy `stage` column.

Owning addon: erpclaw-growth (crm_pipeline, crm_pipeline_stage tables).

This migration:

1. Drops the `stage` CHECK from `opportunity` (dialect-aware):
     - SQLite: rename -> recreate WITHOUT the stage CHECK + WITH the nullable
       pipeline_stage_id column -> copy -> drop -> reindex. SQLite cannot ALTER
       TABLE DROP a CHECK. FK enforcement is OFF and legacy_alter_table is ON
       during the rebuild so the inbound crm_activity.opportunity_id FK keeps
       pointing at "opportunity" (not the temp *_f3_old name). opportunity_type
       CHECK + UNIQUE are retained. All opportunity ids preserved.
     - PostgreSQL: ALTER TABLE opportunity DROP CONSTRAINT IF EXISTS
       opportunity_stage_check (the name Postgres assigns the inline CHECK) +
       ADD COLUMN IF NOT EXISTS pipeline_stage_id TEXT.
2. Seeds the default "Standard Sales" 7-stage pipeline (Option A — self-contained,
   like the M0 seed migrations) IF the growth-owned crm_pipeline / crm_pipeline_stage
   tables exist. This guarantees the backfill in step 3 has a pipeline to point at
   regardless of growth-init ordering. On a foundation-only install (growth absent)
   the seed + backfill are skipped; pipeline_stage_id stays NULL (safe per ADR-0023).
3. Backfills opportunity.pipeline_stage_id from the legacy `stage` text by joining
   the seeded default pipeline's stage whose name == opportunity.stage. Only fires
   for rows where pipeline_stage_id IS NULL and the default pipeline exists.

Per ADR-0023 the pipeline_stage_id column is OPAQUE TEXT — NOT a SQL-level inline
FK. SQLite resolves a column's REFERENCES target at INSERT time even for a NULL
value, so an inline REFERENCES crm_pipeline_stage(id) would break every add-opportunity
on a foundation-only install where crm_pipeline_stage does not exist. (Same probe as
migration 023.) FK integrity is enforced application-side: growth (the sole writer)
validates the target stage exists before populating the column.

Idempotent: detects whether the CHECK is already gone and skips the rebuild; the seed +
backfill are guarded (INSERT only when missing; backfill only NULL rows). Dialect-aware.

Usage:
    python3 024_displace_opportunity_stage_check.py [--db-path PATH]
"""
import argparse
import os
import uuid

DEFAULT_DB_PATH = os.path.join(os.path.expanduser(os.environ.get("ERPCLAW_HOME", "~/.openclaw/erpclaw")), "data.sqlite")

# Default "Standard Sales" pipeline: the existing 7 stages, in order. The terminal
# flags + default probability mirror the legacy hardcoded semantics. Kept in sync
# with init_db.create_crmadv_tables() DEFAULT_PIPELINE_SEED at authoring time.
DEFAULT_PIPELINE_NAME = "Standard Sales"
# (stage_order, name, is_terminal_won, is_terminal_lost, default_probability)
DEFAULT_PIPELINE_STAGES = [
    (1, "new", 0, 0, "0"),
    (2, "contacted", 0, 0, "10"),
    (3, "qualified", 0, 0, "25"),
    (4, "proposal_sent", 0, 0, "50"),
    (5, "negotiation", 0, 0, "75"),
    (6, "won", 1, 0, "100"),
    (7, "lost", 0, 1, "0"),
]

# The `opportunity` table WITHOUT the stage CHECK + WITH pipeline_stage_id.
# Must match init_schema.py exactly (post-F1 columns + the new F3 column).
_OPPORTUNITY_DDL_NO_CHECK = """
CREATE TABLE opportunity (
    id              TEXT PRIMARY KEY,
    naming_series   TEXT,
    opportunity_name TEXT NOT NULL,
    lead_id         TEXT REFERENCES lead(id) ON DELETE RESTRICT,
    customer_id     TEXT REFERENCES customer(id) ON DELETE RESTRICT,
    opportunity_type TEXT NOT NULL DEFAULT 'sales'
                    CHECK(opportunity_type IN ('sales','support','maintenance')),
    source          TEXT,
    expected_closing_date TEXT,
    probability     TEXT NOT NULL DEFAULT '0',
    expected_revenue TEXT NOT NULL DEFAULT '0',
    weighted_revenue TEXT NOT NULL DEFAULT '0',
    stage           TEXT NOT NULL DEFAULT 'new',
    lost_reason     TEXT,
    assigned_to     TEXT,
    next_follow_up_date TEXT,
    quotation_id    TEXT,
    crm_contact_id  TEXT,
    crm_company_id  TEXT,
    pipeline_stage_id TEXT,
    company_id      TEXT NOT NULL REFERENCES company(id) ON DELETE RESTRICT,
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT DEFAULT CURRENT_TIMESTAMP
)
"""

# Columns to copy from the old table (NOT pipeline_stage_id — it's new, stays NULL
# until backfill). Order-independent (explicit column list on both sides).
_OPPORTUNITY_COLS = (
    "id, naming_series, opportunity_name, lead_id, customer_id, opportunity_type, "
    "source, expected_closing_date, probability, expected_revenue, weighted_revenue, "
    "stage, lost_reason, assigned_to, next_follow_up_date, quotation_id, "
    "crm_contact_id, crm_company_id, company_id, created_at, updated_at"
)

_OPPORTUNITY_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_opportunity_stage ON opportunity(stage)",
    "CREATE INDEX IF NOT EXISTS idx_opportunity_company ON opportunity(company_id)",
    "CREATE INDEX IF NOT EXISTS idx_opportunity_customer ON opportunity(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_opportunity_pipeline_stage ON opportunity(pipeline_stage_id)",
]


def _run_postgres(url):
    import psycopg2
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "ALTER TABLE opportunity DROP CONSTRAINT IF EXISTS opportunity_stage_check"
            )
            cur.execute(
                "ALTER TABLE opportunity ADD COLUMN IF NOT EXISTS pipeline_stage_id TEXT"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_opportunity_pipeline_stage "
                "ON opportunity(pipeline_stage_id)"
            )
            # Seed + backfill only when the growth tables exist.
            cur.execute("SELECT to_regclass('public.crm_pipeline_stage')")
            has_growth = cur.fetchone()[0] is not None
            if has_growth:
                cur.execute(
                    "SELECT id FROM crm_pipeline WHERE is_default = 1 "
                    "ORDER BY created_at LIMIT 1")
                row = cur.fetchone()
                if row is None:
                    cur.execute(
                        "SELECT id FROM crm_pipeline WHERE name = %s "
                        "ORDER BY created_at LIMIT 1", (DEFAULT_PIPELINE_NAME,))
                    row = cur.fetchone()
                if row is None:
                    pipeline_id = str(uuid.uuid4())
                    cur.execute(
                        "INSERT INTO crm_pipeline (id, name, description, is_default, is_active) "
                        "VALUES (%s, %s, %s, 1, 1)",
                        (pipeline_id, DEFAULT_PIPELINE_NAME,
                         "Default sales pipeline (seeded for backfill of legacy opportunity.stage)"))
                    for order_no, name, won, lost, prob in DEFAULT_PIPELINE_STAGES:
                        cur.execute(
                            "INSERT INTO crm_pipeline_stage "
                            "(id, crm_pipeline_id, stage_order, name, is_terminal_won, "
                            " is_terminal_lost, default_probability, is_active) "
                            "VALUES (%s, %s, %s, %s, %s, %s, %s, 1)",
                            (str(uuid.uuid4()), pipeline_id, order_no, name, won, lost, prob))
                else:
                    pipeline_id = row[0]
                cur.execute(
                    """UPDATE opportunity o
                       SET pipeline_stage_id = s.id
                       FROM crm_pipeline_stage s
                       WHERE s.crm_pipeline_id = %s
                         AND s.name = o.stage
                         AND o.pipeline_stage_id IS NULL""",
                    (pipeline_id,))
        conn.commit()
        print("  Postgres: opportunity stage CHECK dropped; pipeline_stage_id added; seed/backfill applied.")
    finally:
        conn.close()


def run_migration(db_path=None):
    url = os.environ.get("ERPCLAW_DB_URL") or db_path
    if not url:
        print("No Postgres connection URL (ERPCLAW_DB_URL). Nothing to migrate.")
        return
    _run_postgres(url)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migration 024: Displace opportunity.stage CHECK + pipeline_stage_id")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH)
    args = parser.parse_args()
    run_migration(args.db_path)
    print("Migration 024 complete.")
