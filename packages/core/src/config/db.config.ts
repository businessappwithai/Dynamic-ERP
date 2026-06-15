/**
 * DATABASE CONFIGURATION — single place to change DB connection.
 *
 * To switch databases: update createPool() call and dialect below.
 * All env vars read here only; nothing else in the codebase reads DB env vars.
 *
 * Supported env vars:
 *   DATABASE_URL          mysql://user:pass@host:3306/dbname  (takes precedence)
 *   MARIADB_HOST          default: 127.0.0.1
 *   MARIADB_PORT          default: 3306
 *   MARIADB_USER          default: erdwithai
 *   MARIADB_PASSWORD      default: (empty)
 *   MARIADB_DATABASE      default: erdwithai
 *   MARIADB_CONNECTION_LIMIT  default: 10
 */

import { Kysely, MysqlDialect } from "kysely";
import { createPool } from "mysql2/promise";
import type { Database } from "./db.types.js";

export type { Database };

function buildPoolConfig() {
  const url = process.env.DATABASE_URL;

  if (url && (url.startsWith("mysql://") || url.startsWith("mariadb://"))) {
    const parsed = new URL(url.replace(/^mariadb:\/\//, "mysql://"));
    return {
      host: parsed.hostname || "127.0.0.1",
      port: parsed.port ? Number(parsed.port) : 3306,
      user: parsed.username || "erdwithai",
      password: parsed.password || "",
      database: parsed.pathname.replace(/^\//, "") || "erdwithai",
      connectionLimit: Number(process.env.MARIADB_CONNECTION_LIMIT ?? 10),
      waitForConnections: true,
      enableKeepAlive: true,
    };
  }

  return {
    host: process.env.MARIADB_HOST ?? "127.0.0.1",
    port: Number(process.env.MARIADB_PORT ?? 3306),
    user: process.env.MARIADB_USER ?? "erdwithai",
    password: process.env.MARIADB_PASSWORD ?? "",
    database: process.env.MARIADB_DATABASE ?? "erdwithai",
    connectionLimit: Number(process.env.MARIADB_CONNECTION_LIMIT ?? 10),
    waitForConnections: true,
    enableKeepAlive: true,
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
      dialect: new MysqlDialect({
        pool: createPool(buildPoolConfig()),
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
