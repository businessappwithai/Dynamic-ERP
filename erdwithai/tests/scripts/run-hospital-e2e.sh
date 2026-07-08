#!/bin/bash

set -e

echo "=========================================="
echo "Hospital E2E Test Script"
echo "=========================================="

PROJECT_DIR="/Users/pramodkoshy/projects/dynamic/test/app-with-ai"
HOSPITAL_DIR="$PROJECT_DIR/test-output/hospital-test/hospital-app"
BACKEND_DIR="$HOSPITAL_DIR/backend"
FRONTEND_DIR="$HOSPITAL_DIR/frontend"

cd "$PROJECT_DIR"

# Step 1: Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "nest start" || true
pkill -f "next dev" || true
sleep 2

# Step 2: Check if hospital app exists, if not regenerate
if [ ! -d "$HOSPITAL_DIR" ]; then
  echo "📦 Hospital app not found. Generating..."
  rm -rf test-output/hospital-test
  bun run bin/index.mjs generate \
    scripts/hospital-management/hospital.erd.mmd \
    test-output/hospital-test/hospital-app \
    --option 1
fi

# Step 3: Setup backend database
echo "💾 Setting up backend database..."
cd "$BACKEND_DIR"

# Create migration scripts if they don't exist
if [ ! -f "run-migrations.ts" ]; then
  cat > run-migrations.ts << 'MIGRATE_EOF'
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
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runMigrations();
MIGRATE_EOF
fi

if [ ! -f "run-seed.ts" ]; then
  cat > run-seed.ts << 'SEED_EOF'
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
    console.log('✅ Seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runSeed();
SEED_EOF
fi

# Install dependencies
echo "📥 Installing backend dependencies..."
bun install > /dev/null 2>&1

# Create data directory and run migrations
mkdir -p data
echo "🚀 Running migrations..."
npx tsx run-migrations.ts

echo "🌱 Running seeds..."
npx tsx run-seed.ts

# Step 4: Start backend server
echo "🔧 Starting backend server..."
nohup bun run start:dev > /tmp/hospital-backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/hospital-backend.pid
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
for i in {1..30}; do
  if curl -s http://localhost:3000/api/health > /dev/null 2>&1 || curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Backend is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Backend failed to start"
    tail -50 /tmp/hospital-backend.log
    exit 1
  fi
  sleep 1
done

# Step 5: Setup and start frontend
echo "🎨 Starting frontend server..."
cd "$FRONTEND_DIR"

# Install dependencies
echo "📥 Installing frontend dependencies..."
bun install > /dev/null 2>&1

nohup bun run dev > /tmp/hospital-frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/hospital-frontend.pid
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
for i in {1..30}; do
  if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ Frontend is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Frontend failed to start"
    tail -50 /tmp/hospital-frontend.log
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# Step 6: Run Playwright tests
echo "🧪 Running Playwright tests..."
cd "$PROJECT_DIR"

cat > test-hospital-e2e.ts << 'TEST_EOF'
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const page = await browser.newPage();
  const results = [];

  // Test entities
  const entities = [
    { name: 'DOCTOR', url: 'http://localhost:3001/bus_d_o_c_t_o_r' },
    { name: 'PATIENT', url: 'http://localhost:3001/bus_p_a_t_i_e_n_t' },
    { name: 'APPOINTMENT', url: 'http://localhost:3001/bus_a_p_p_o_i_n_t_m_e_n_t' },
    { name: 'DEPARTMENT', url: 'http://localhost:3001/bus_d_e_p_a_r_t_m_e_n_t' }
  ];

  for (const entity of entities) {
    console.log(`\n🔍 Testing ${entity.name}...`);
    await page.goto(entity.url);

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Take screenshot
    const screenshotPath = `/tmp/${entity.name.toLowerCase()}-test.png`;
    await page.screenshot({ path: screenshotPath });

    // Check for table
    const tableVisible = await page.locator('table').isVisible().catch(() => false);
    console.log(`  Table visible: ${tableVisible}`);

    // Check for data rows
    let rowCount = 0;
    try {
      rowCount = await page.locator('table tbody tr').count();
      console.log(`  Data rows: ${rowCount}`);
    } catch (e) {
      console.log(`  Data rows: 0 (error counting)`);
    }

    // Check for "No data available" message
    const noDataVisible = await page.locator('text=/no data available/i').isVisible().catch(() => false);
    console.log(`  No data message: ${noDataVisible}`);

    // Check heading
    const headingVisible = await page.locator(`h1, h2`).filter({ hasText: new RegExp(entity.name, 'i') }).isVisible().catch(() => false);
    console.log(`  Heading visible: ${headingVisible}`);

    results.push({
      entity: entity.name,
      tableVisible,
      rowCount,
      noDataVisible,
      headingVisible,
      screenshot: screenshotPath
    });
  }

  await browser.close();

  // Write results
  writeFileSync('/tmp/hospital-test-results.json', JSON.stringify(results, null, 2));

  console.log('\n==========================================');
  console.log('Test Results Summary');
  console.log('==========================================');

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const success = result.tableVisible && result.rowCount > 0 && !result.noDataVisible;
    if (success) {
      passed++;
      console.log(`✅ ${result.entity}: PASSED (${result.rowCount} rows)`);
    } else {
      failed++;
      console.log(`❌ ${result.entity}: FAILED`);
      if (!result.tableVisible) console.log(`   - Table not visible`);
      if (result.rowCount === 0) console.log(`   - No data rows`);
      if (result.noDataVisible) console.log(`   - "No data available" message shown`);
    }
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  console.log('\nScreenshots saved to /tmp/');
  console.log('Full results: /tmp/hospital-test-results.json');

  process.exit(failed > 0 ? 1 : 0);
})();
TEST_EOF

npx tsx test-hospital-e2e.ts
TEST_RESULT=$?

# Step 7: Cleanup
echo "🧹 Cleaning up..."
kill $(cat /tmp/hospital-backend.pid) 2>/dev/null || true
kill $(cat /tmp/hospital-frontend.pid) 2>/dev/null || true
rm /tmp/hospital-backend.pid /tmp/hospital-frontend.pid

if [ $TEST_RESULT -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed. Check logs above."
  exit 1
fi
