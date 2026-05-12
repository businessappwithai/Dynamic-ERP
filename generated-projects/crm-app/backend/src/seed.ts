/**
 * Database Seed Runner
 * Run with: bun run src/seed.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import { Kysely, PostgresDialect, SqliteDialect } from 'kysely';
import 'dotenv/config';

const dbClient = process.env.DATABASE_CLIENT ?? 'pg';

async function createDialect(): Promise<PostgresDialect | SqliteDialect> {
  if (dbClient === 'better-sqlite3' || dbClient === 'sqlite') {
    const { Database } = await import('bun:sqlite');
    const dbPath = process.env.DATABASE_FILENAME ?? './data/crm-app.db';
    const db = new Database(dbPath, { create: true });
    return new SqliteDialect({ database: db as any });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Pool } = require('pg');
    return new PostgresDialect({
      pool: new Pool({
        host: process.env.DATABASE_HOST ?? 'localhost',
        port: Number(process.env.DATABASE_PORT ?? 5432),
        user: process.env.DATABASE_USER ?? 'postgres',
        password: process.env.DATABASE_PASSWORD ?? '',
        database: process.env.DATABASE_NAME ?? 'crm-app',
      }),
    });
  }
}

async function runSeeds(db: Kysely<any>) {
  const seedDir = path.join(__dirname, '..', 'seeds');
  const files = (await fs.promises.readdir(seedDir))
    .filter(f => f.endsWith('.ts') && !f.endsWith('.bak') && f === '01_sys_references.ts')
    .sort();

  for (const file of files) {
    const seedPath = path.join(seedDir, file);
    const seedModule = await import(seedPath);

    if (seedModule.seed) {
      try {
        console.log(`Running seed: ${file}`);
        await seedModule.seed(db);
        console.log(`✓ Seed "${file}" completed`);
      } catch (error) {
        console.error(`✗ Seed "${file}" failed:`, error);
        throw error;
      }
    }
  }

  console.log('\n⚠  02_sys_dictionary.ts and 03_business_data.ts will be enhanced in future iterations');
  console.log('   They require detailed schema refinement matching the complete data model.\n');
}

(async () => {
  const dialect = await createDialect();
  const db = new Kysely<any>({ dialect });

  try {
    await runSeeds(db);
    console.log('✓ Seed initialization completed');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
})().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
