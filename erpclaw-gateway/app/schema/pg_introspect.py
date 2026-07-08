"""Postgres schema introspection for GET /api/v1/schema/{entity}.

Replaces the architecture doc's raw-sqlite3/PRAGMA scaffold entirely with
information_schema queries via psycopg2. Entity name is assumed to equal the
Postgres table name (erpclaw's DDL uses plain singular table names matching
its domain vocabulary, e.g. "customer", "company", "sales_invoice" — verified
against erpclaw_lib.query's PyPika table refs); no alias table is needed
unless a real mismatch turns up in testing.
"""
import psycopg2
import psycopg2.extras

from app.config import settings


def _connect():
    if not settings.erpclaw_db_url:
        raise RuntimeError("ERPCLAW_DB_URL is not set in the gateway's environment.")
    return psycopg2.connect(settings.erpclaw_db_url)


def table_exists(table_name: str) -> bool:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = %s",
            (table_name,),
        )
        return cur.fetchone() is not None


def entity_schema(table_name: str) -> dict | None:
    if not table_exists(table_name):
        return None

    with _connect() as conn, conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
        cur.execute(
            """
            SELECT column_name, data_type, is_nullable, column_default,
                   character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
            """,
            (table_name,),
        )
        columns = [dict(row) for row in cur.fetchall()]

        cur.execute(
            """
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = 'public' AND tc.table_name = %s
              AND tc.constraint_type = 'PRIMARY KEY'
            """,
            (table_name,),
        )
        primary_key = [row["column_name"] for row in cur.fetchall()]

        cur.execute(
            """
            SELECT kcu.column_name, ccu.table_name AS foreign_table,
                   ccu.column_name AS foreign_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
              ON tc.constraint_name = ccu.constraint_name
             AND tc.table_schema = ccu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
              AND tc.table_name = %s
            """,
            (table_name,),
        )
        foreign_keys = [dict(row) for row in cur.fetchall()]

    return {
        "entity": table_name,
        "columns": columns,
        "primary_key": primary_key,
        "foreign_keys": foreign_keys,
    }
