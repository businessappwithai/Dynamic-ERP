/**
 * Database Seed Runner
 * Run with: bun run src/seed.ts
 *
 * Generated: 2026-05-16T05:41:32.613Z
 */

import * as path from 'path';
import * as fs from 'fs';
import { Kysely } from 'kysely';
import { PGlite } from '@electric-sql/pglite';
import { PGliteDialect } from 'kysely-pglite-dialect';
import { config } from 'dotenv';

// Load .env from backend root (parent of src/) regardless of cwd
config({ path: path.join(__dirname, '..', '.env') });
config({ path: path.join(__dirname, '..', '.env.local'), override: true });

async function createDialect() {
  const dbDir = process.env.DATABASE_DIR ?? path.join(__dirname, '..', 'data', 'c_r_m _regenerated 2.db');
  fs.mkdirSync(dbDir, { recursive: true });
  const pglite = new PGlite(dbDir);
  await pglite.waitReady;
  return new PGliteDialect(pglite);
}

async function runSeeds(db: Kysely<any>) {
  const seedDir = path.join(__dirname, '..', 'seeds');
  const files = (await fs.promises.readdir(seedDir))
    .filter(f => f.endsWith('.ts') && !f.endsWith('.bak'))
    .sort();

  console.log(`Found seed files: ${files.join(', ')}`);

  for (const file of files) {
    // Skip template-generated files with incorrect schema
    if (file === '01_sys_references.ts' || file === '02_sys_dictionary.ts' || file === '03_business_data.ts') {
      console.log(`Skipping file: ${file} (template-generated with schema issues)`);
      continue;
    }

    const seedPath = path.join(seedDir, file);
    console.log(`Attempting to load seed from: ${seedPath}`);
    const seedModule = await import(seedPath);

    if (seedModule.seed) {
      try {
        console.log(`Running seed: ${file}`);
        await seedModule.seed(db);
        console.log(`✓ Seed "${file}" completed`);
      } catch (error) {
        console.error(`✗ Seed "${file}" failed:`, error);
        // Continue on error instead of throwing to allow other seeds to run
        // throw error;
      }
    }
  }
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
