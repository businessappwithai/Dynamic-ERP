/**
 * DATABASE CONFIGURATION — single place to change DB connection.
 *
 * To switch databases: update buildPoolConfig() and the dialect below.
 * All env vars read here only; nothing else in the codebase reads DB env vars.
 *
 * Supported env vars:
 *   DATABASE_URL          postgres://user:pass@host:5432/dbname  (takes precedence)
 *   POSTGRES_HOST         default: 127.0.0.1
 *   POSTGRES_PORT         default: 5432
 *   POSTGRES_USER         default: erdwithai
 *   POSTGRES_PASSWORD     default: (empty)
 *   POSTGRES_DATABASE     default: erdwithai
 *   POSTGRES_POOL_MAX     default: 10
 */

import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "./db.types.js";

export type { Database };

function buildPoolConfig() {
  const url = process.env.DATABASE_URL;

  if (url && (url.startsWith("postgres://") || url.startsWith("postgresql://"))) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || "127.0.0.1",
      port: parsed.port ? Number(parsed.port) : 5432,
      user: parsed.username || "erdwithai",
      password: parsed.password || "",
      database: parsed.pathname.replace(/^\//, "") || "erdwithai",
      max: Number(process.env.POSTGRES_POOL_MAX ?? 10),
    };
  }

  return {
    host: process.env.POSTGRES_HOST ?? "127.0.0.1",
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    user: process.env.POSTGRES_USER ?? "erdwithai",
    password: process.env.POSTGRES_PASSWORD ?? "",
    database: process.env.POSTGRES_DATABASE ?? "erdwithai",
    max: Number(process.env.POSTGRES_POOL_MAX ?? 10),
  };
}

let _db: Kysely<Database> | null = null;

/**
 * Returns the shared Kysely<Database> instance (lazy singleton).
 * Call this anywhere you need a DB handle.
 */
export function getDb(): Kysely<Database> {
  if (!_db) {
    _db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new Pool(buildPoolConfig()),
      }),
    });
  }
  return _db;
}

/**
 * Destroy the connection pool (use in tests or graceful shutdown).
 */
export async function destroyDb(): Promise<void> {
  if (_db) {
    await _db.destroy();
    _db = null;
  }
}
