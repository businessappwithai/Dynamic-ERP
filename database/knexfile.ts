/**
 * Knex.js configuration for ERDwithAI
 * Using SQLite database for local storage
 */

import type { Knex } from "knex";

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "bun:sqlite",
    connection: {
      filename: "./database/generator.sql",
    },
    migrations: {
      directory: "./database/migrations",
      extension: "ts",
    },
    seeds: {
      directory: "./database/seeds",
    },
    useNullAsDefault: true,
  },

  production: {
    client: "bun:sqlite",
    connection: {
      filename: "./database/generator.sql",
    },
    migrations: {
      directory: "./database/migrations",
      extension: "ts",
    },
    useNullAsDefault: true,
  },
};

export default config;
