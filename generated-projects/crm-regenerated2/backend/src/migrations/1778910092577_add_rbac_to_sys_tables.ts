/**
 * Migration: Add RBAC columns to sys_* tables
 *
 * Adds role_accessible[] and is_public columns to sys_table, sys_column,
 * sys_field, and sys_role so that ElectricSQL/TanStack DB shapes can be
 * filtered server-side by the authenticated user's roles.
 *
 * SECURITY: Without these columns, every user would see every other user's
 * custom field definitions — a critical data leakage risk.
 */

import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // sys_table: add RBAC columns
  await sql`
    ALTER TABLE sys_table
    ADD COLUMN IF NOT EXISTS role_accessible TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE
  `.execute(db);

  // sys_column: add RBAC columns
  await sql`
    ALTER TABLE sys_column
    ADD COLUMN IF NOT EXISTS role_accessible TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE
  `.execute(db);

  // sys_field: add RBAC columns (most critical — controls form visibility)
  await sql`
    ALTER TABLE sys_field
    ADD COLUMN IF NOT EXISTS role_accessible TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE
  `.execute(db);

  // Indexes for performance on RBAC queries
  await sql`
    CREATE INDEX IF NOT EXISTS idx_sys_table_is_public ON sys_table (is_public)
  `.execute(db);
  await sql`
    CREATE INDEX IF NOT EXISTS idx_sys_field_is_public ON sys_field (is_public)
  `.execute(db);
  await sql`
    CREATE INDEX IF NOT EXISTS idx_sys_column_is_public ON sys_column (is_public)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE sys_field DROP COLUMN IF EXISTS role_accessible, DROP COLUMN IF EXISTS is_public`.execute(db);
  await sql`ALTER TABLE sys_column DROP COLUMN IF EXISTS role_accessible, DROP COLUMN IF EXISTS is_public`.execute(db);
  await sql`ALTER TABLE sys_table DROP COLUMN IF EXISTS role_accessible, DROP COLUMN IF EXISTS is_public`.execute(db);
}
