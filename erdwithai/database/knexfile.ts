/**
 * Knex.js configuration for ERDwithAI generator migrations
 * Uses PostgreSQL via the pg driver.
 * Connection reads the same env vars as the core db.config.ts.
 */

import type { Knex } from "knex";

function buildConnection() {
  const url = process.env.DATABASE_URL;
  if (url && (url.startsWith("postgres://") || url.startsWith("postgresql://"))) {
    return url;
  }
  return {
    host: process.env.POSTGRES_HOST ?? "127.0.0.1",
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    user: process.env.POSTGRES_USER ?? "erdwithai",
    password: process.env.POSTGRES_PASSWORD ?? "",
    database: process.env.POSTGRES_DATABASE ?? "erdwithai",
  };
}

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "pg",
    connection: buildConnection(),
    migrations: {
      directory: "./database/migrations",
      extension: "ts",
    },
    seeds: {
      directory: "./database/seeds",
    },
  },

  production: {
    client: "pg",
    connection: buildConnection(),
    migrations: {
      directory: "./database/migrations",
      extension: "ts",
    },
  },
};

export default config;
