#!/usr/bin/env python3
"""ERPClaw OS — Schema Diff Engine

Compares the live database schema (information_schema, PostgreSQL) against
the declared schema in init_db.py files. Detects drift (manual DB
modifications that diverge from declared schema) and produces migration DDL.

Used by schema_migrator.py for plan/apply/rollback operations.
"""
import os
import re


# ---------------------------------------------------------------------------
# DDL Parsing (reuse patterns from validate_module.py)
# ---------------------------------------------------------------------------

_CREATE_TABLE_RE = re.compile(
    r"CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)\s*\(",
    re.IGNORECASE | re.MULTILINE,
)

_CREATE_INDEX_RE = re.compile(
    r"CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+(\w+)\s+ON\s+(\w+)\s*\(",
    re.IGNORECASE | re.MULTILINE,
)


def parse_init_db_ddl(init_db_path):
    """Extract declared tables and columns from an init_db.py file.

    Returns dict: {table_name: {columns: [{name, type, is_pk, constraints}], indexes: [...]}}
    """
    if not os.path.isfile(init_db_path):
        return {}

    with open(init_db_path, "r") as f:
        content = f.read()

    return parse_ddl_text(content)


def parse_ddl_text(ddl_text):
    """Parse DDL text into structured table definitions.

    Returns dict: {table_name: {columns: [{name, type, is_pk, constraints}], indexes: [...]}}
    """
    tables = {}

    # Extract CREATE TABLE blocks
    for match in re.finditer(
        r"CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)\s*\((.*?)\)\s*;",
        ddl_text,
        re.IGNORECASE | re.DOTALL,
    ):
        table_name = match.group(1)
        body = match.group(2)
        columns = []

        for line in body.split("\n"):
            line = line.strip().rstrip(",")
            if not line:
                continue

            upper = line.upper().lstrip()
            if any(upper.startswith(kw) for kw in (
                "CREATE", "FOREIGN", "UNIQUE", "CHECK(", "PRIMARY KEY(",
                "CONSTRAINT", "--", "/*", ")", "INDEX",
            )):
                continue

            col_match = re.match(
                r"(\w+)\s+(TEXT|INTEGER|REAL|FLOAT|NUMERIC|BLOB)\b(.*)",
                line, re.IGNORECASE,
            )
            if col_match:
                col_name = col_match.group(1)
                col_type = col_match.group(2).upper()
                constraints = col_match.group(3).strip()
                is_pk = "PRIMARY KEY" in line.upper()
                columns.append({
                    "name": col_name,
                    "type": col_type,
                    "is_pk": is_pk,
                    "constraints": constraints,
                })

        tables[table_name] = {"columns": columns, "indexes": []}

    # Extract CREATE INDEX blocks
    for match in _CREATE_INDEX_RE.finditer(ddl_text):
        idx_name = match.group(1)
        table_name = match.group(2)
        if table_name in tables:
            tables[table_name]["indexes"].append(idx_name)

    return tables


# Postgres information_schema.columns.data_type strings, mapped back to the
# SQLite-flavored type vocabulary parse_ddl_text() extracts from init_db.py
# files (TEXT, INTEGER, REAL, NUMERIC, BLOB) so live-vs-declared type
# comparisons in diff_schema() stay meaningful now that the live side is
# introspected from Postgres instead of sqlite_master/PRAGMA table_info.
# Unrecognized Postgres types pass through uppercased as-is — a resulting
# mismatch surfaces as a type_change finding rather than silently hiding a
# real difference.
_PG_TO_DECLARED_TYPE = {
    "text": "TEXT",
    "character varying": "TEXT",
    "varchar": "TEXT",
    "char": "TEXT",
    "character": "TEXT",
    "integer": "INTEGER",
    "bigint": "INTEGER",
    "smallint": "INTEGER",
    "real": "REAL",
    "double precision": "REAL",
    "numeric": "NUMERIC",
    "decimal": "NUMERIC",
    "bytea": "BLOB",
    "boolean": "INTEGER",  # declared DDL uses INTEGER 0/1 for booleans (SQLite convention)
}


def _pg_type_to_declared(data_type):
    """Map an information_schema.columns.data_type value to the declared
    (SQLite-flavored) type vocabulary. See _PG_TO_DECLARED_TYPE for why."""
    return _PG_TO_DECLARED_TYPE.get(data_type.lower(), data_type.upper())


def get_live_schema(db_path):
    """Query information_schema for current tables and their columns.

    Returns dict: {table_name: {columns: [{name, type, is_pk}], indexes: [...]}}

    Best-effort: any connection failure (no ERPCLAW_DB_URL configured yet,
    server unreachable, ...) returns an empty schema, mirroring the old
    "file doesn't exist yet" behavior rather than raising.
    """
    from erpclaw_lib.db import get_connection

    try:
        conn = get_connection(db_path)
    except Exception:
        return {}

    try:
        tables = {}

        # Get all user tables in the public schema
        rows = conn.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
        ).fetchall()

        # Primary-key columns per table (information_schema has no single
        # "pk flag" column the way PRAGMA table_info did).
        pk_rows = conn.execute(
            "SELECT tc.table_name, kcu.column_name "
            "FROM information_schema.table_constraints tc "
            "JOIN information_schema.key_column_usage kcu "
            "  ON tc.constraint_name = kcu.constraint_name "
            " AND tc.table_schema = kcu.table_schema "
            "WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'"
        ).fetchall()
        pk_cols = {}
        for tbl, col in pk_rows:
            pk_cols.setdefault(tbl, set()).add(col)

        for (table_name,) in rows:
            columns = []
            col_rows = conn.execute(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = ? "
                "ORDER BY ordinal_position",
                (table_name,),
            ).fetchall()
            for col_name, data_type in col_rows:
                columns.append({
                    "name": col_name,
                    "type": _pg_type_to_declared(data_type) if data_type else "TEXT",
                    "is_pk": col_name in pk_cols.get(table_name, set()),
                })
            tables[table_name] = {"columns": columns, "indexes": []}

        # Get indexes
        idx_rows = conn.execute(
            "SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public'"
        ).fetchall()
        for idx_name, tbl_name in idx_rows:
            if tbl_name in tables:
                tables[tbl_name]["indexes"].append(idx_name)

        return tables
    finally:
        conn.close()


def diff_schema(db_path, init_db_path):
    """Compare live DB schema vs declared DDL.

    Returns dict with:
    - new_tables: tables in DDL but not in DB (need CREATE)
    - dropped_tables: tables in DB but not in DDL (potential DROP)
    - new_columns: columns in DDL but not in DB (need ALTER ADD)
    - dropped_columns: columns in DB but not in DDL (potential DROP)
    - type_changes: columns where type differs
    - matching_tables: tables that exist in both and match
    """
    declared = parse_init_db_ddl(init_db_path)
    live = get_live_schema(db_path)

    declared_names = set(declared.keys())
    live_names = set(live.keys())

    new_tables = sorted(declared_names - live_names)
    dropped_tables = sorted(live_names - declared_names)
    common_tables = declared_names & live_names

    new_columns = []
    dropped_columns = []
    type_changes = []
    matching_tables = []

    for table in sorted(common_tables):
        decl_cols = {c["name"]: c for c in declared[table]["columns"]}
        live_cols = {c["name"]: c for c in live[table]["columns"]}

        decl_col_names = set(decl_cols.keys())
        live_col_names = set(live_cols.keys())

        table_match = True

        for col_name in sorted(decl_col_names - live_col_names):
            new_columns.append({
                "table": table,
                "column": col_name,
                "type": decl_cols[col_name]["type"],
            })
            table_match = False

        for col_name in sorted(live_col_names - decl_col_names):
            dropped_columns.append({
                "table": table,
                "column": col_name,
                "type": live_cols[col_name]["type"],
            })
            table_match = False

        for col_name in sorted(decl_col_names & live_col_names):
            decl_type = decl_cols[col_name]["type"]
            live_type = live_cols[col_name]["type"]
            if decl_type != live_type:
                type_changes.append({
                    "table": table,
                    "column": col_name,
                    "declared_type": decl_type,
                    "live_type": live_type,
                })
                table_match = False

        if table_match:
            matching_tables.append(table)

    return {
        "new_tables": new_tables,
        "dropped_tables": dropped_tables,
        "new_columns": new_columns,
        "dropped_columns": dropped_columns,
        "type_changes": type_changes,
        "matching_tables": matching_tables,
        "has_differences": bool(
            new_tables or dropped_tables or new_columns
            or dropped_columns or type_changes
        ),
    }


def detect_drift(db_path, module_path):
    """Detect schema drift: manual DB changes that diverge from declared schema.

    Returns list of drift findings, each a dict with:
    - type: 'extra_table', 'extra_column', 'missing_column', 'type_mismatch'
    - table, column (if applicable), details
    """
    init_db_path = os.path.join(module_path, "init_db.py")
    if not os.path.isfile(init_db_path):
        return []

    diff = diff_schema(db_path, init_db_path)
    findings = []

    # Tables in DB not in DDL — could be drift or from another module
    # We only flag if the table uses this module's prefix
    module_name = os.path.basename(module_path).replace("-", "_")
    prefix = module_name.split("_")[0] + "_" if "_" in module_name else module_name + "_"

    for table in diff["dropped_tables"]:
        if table.startswith(prefix):
            findings.append({
                "type": "extra_table",
                "table": table,
                "details": f"Table '{table}' exists in DB but not in init_db.py",
            })

    for col in diff["new_columns"]:
        findings.append({
            "type": "missing_column",
            "table": col["table"],
            "column": col["column"],
            "details": f"Column '{col['column']}' declared in init_db.py but missing from DB table '{col['table']}'",
        })

    for col in diff["dropped_columns"]:
        findings.append({
            "type": "extra_column",
            "table": col["table"],
            "column": col["column"],
            "details": f"Column '{col['column']}' exists in DB table '{col['table']}' but not in init_db.py",
        })

    for tc in diff["type_changes"]:
        findings.append({
            "type": "type_mismatch",
            "table": tc["table"],
            "column": tc["column"],
            "details": f"Column '{tc['column']}' in '{tc['table']}': declared as {tc['declared_type']}, DB has {tc['live_type']}",
        })

    return findings


def generate_create_ddl(init_db_path, tables_to_create):
    """Generate CREATE TABLE DDL for specific tables from an init_db.py file.

    Returns list of DDL strings ready to execute.
    """
    if not os.path.isfile(init_db_path):
        return []

    with open(init_db_path, "r") as f:
        content = f.read()

    ddl_statements = []

    # Extract complete CREATE TABLE blocks for requested tables
    for table_name in tables_to_create:
        pattern = re.compile(
            rf"(CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+{re.escape(table_name)}\s*\(.*?\)\s*;)",
            re.IGNORECASE | re.DOTALL,
        )
        match = pattern.search(content)
        if match:
            ddl_statements.append(match.group(1))

        # Also find indexes for this table
        for idx_match in re.finditer(
            rf"(CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+\w+\s+ON\s+{re.escape(table_name)}\s*\(.*?\)\s*;)",
            content,
            re.IGNORECASE | re.DOTALL,
        ):
            ddl_statements.append(idx_match.group(1))

    return ddl_statements
