#!/bin/bash
set -e

echo "🏥 Hospital E2E Test - Quick Start"
echo "=================================="

cd /Users/pramodkoshy/projects/dynamic/test/app-with-ai

# Step 1: Generate hospital app
echo "📦 Generating hospital app..."
rm -rf test-output/hospital-test
bun run bin/index.mjs generate \
  scripts/hospital-management/hospital.erd.mmd \
  test-output/hospital-test/hospital-app \
  --option 1

# Step 2: Setup backend
cd test-output/hospital-test/hospital-app/backend

cat > run-migrations.ts << 'MIGEOF'
import knex from 'knex';
import dotenv from 'dotenv';
dotenv.config();
const config = {
  client: 'better-sqlite3',
  connection: { filename: './data/hospital-hms.db' },
  useNullAsDefault: true,
  migrations: { directory: './migrations', tableName: 'knex_migrations' },
  seeds: { directory: './seeds' }
};
async function runMigrations() {
  const db = knex(config);
  try {
    await db.migrate.latest();
    console.log('✅ Migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}
runMigrations();
MIGEOF

cat > run-seed.ts << 'SEEDOF'
import knex from 'knex';
import dotenv from 'dotenv';
dotenv.config();
const config = {
  client: 'better-sqlite3',
  connection: { filename: './data/hospital-hms.db' },
  useNullAsDefault: true,
  migrations: { directory: './migrations', tableName: 'knex_migrations' },
  seeds: { directory: './seeds' }
};
async function runSeed() {
  const db = knex(config);
  try {
    await db.seed.run();
    console.log('✅ Seeds completed');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}
runSeed();
SEEDOF

echo "📥 Installing backend..."
bun install 2>&1 | tail -5

mkdir -p data
echo "🚀 Running migrations..."
npx tsx run-migrations.ts

echo "🌱 Running seeds..."
npx tsx run-seed.ts

# Step 3: Start servers
echo "🔧 Starting backend server..."
cd /Users/pramodkoshy/projects/dynamic/test/app-with-ai/test-output/hospital-test/hospital-app/backend
bun run start:dev &
BPID=$!
echo "Backend PID: $BPID"

sleep 5

echo "🎨 Starting frontend server..."
cd /Users/pramodkoshy/projects/dynamic/test/app-with-ai/test-output/hospital-test/hospital-app/frontend
bun install 2>&1 | tail -5
bun run dev &
FPID=$!
echo "Frontend PID: $FPID"

sleep 8

# Step 4: Run tests
echo "🧪 Running tests..."
cd /Users/pramodkoshy/projects/dynamic/test/app-with-ai

cat > test-quick.ts << 'TESTEOF'
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const entities = ['DOCTOR', 'PATIENT'];
  const results = [];

  for (const name of entities) {
    const url = `http://localhost:3001/bus_${name.toLowerCase().split('').join('_')}`;
    console.log(`\n🔍 Testing ${name} at ${url}`);
    await page.goto(url);
    await page.waitForTimeout(3000);

    const rows = await page.locator('table tbody tr').count().catch(() => 0);
    const table = await page.locator('table').isVisible().catch(() => false);
    const noData = await page.locator('text=/no data/i').isVisible().catch(() => false);

    console.log(`  Table: ${table}, Rows: ${rows}, NoData: ${noData}`);

    results.push({ name, table, rows, noData });
    await page.screenshot({ path: `/tmp/${name}.png` });
  }

  await browser.close();

  console.log('\n📊 Results:');
  results.forEach(r => {
    const pass = r.table && r.rows > 0 && !r.noData;
    console.log(`${pass ? '✅' : '❌'} ${r.name}: ${r.rows} rows`);
  });
})();
TESTEOF

npx tsx test-quick.ts

# Cleanup
echo "\n🧹 Cleaning up..."
kill $BPID $FPID 2>/dev/null || true

echo "\n✅ Test complete!"
