#!/bin/bash

################################################################################
# Quick E2E Test Script
#
# Fast E2E testing for development - tests Option 1 with SQLite only
# Use this for rapid iteration during development
#
# Usage: ./scripts/quick-test.sh
#
################################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_OUTPUT_DIR="$PROJECT_ROOT/test-output/quick-test"
LOG_DIR="$PROJECT_ROOT/test-results/quick-test"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
log_success() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} ✅ $1"; }
log_error() { echo -e "${RED}[$(date +'%H:%M:%S')]${NC} ❌ $1"; }

cleanup() {
    log "Cleaning up..."
    killall -9 node bun 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    sleep 2
}

trap cleanup EXIT INT TERM

# Setup
log "Setting up quick test..."
mkdir -p "$LOG_DIR"
mkdir -p "$(dirname "$PROJECT_ROOT/test-data/hospital-erd.mermaid")"

# Create test ERD
if [ ! -f "$PROJECT_ROOT/test-data/hospital-erd.mermaid" ]; then
    cat > "$PROJECT_ROOT/test-data/hospital-erd.mermaid" << 'EOF'
erDiagram
    PATIENT {
        string id PK
        string name
        string email UK
        created_at timestamp
    }
    DOCTOR {
        string id PK
        string name
        string email UK
        created_at timestamp
    }
EOF
fi

# Build generator
log "Building generator..."
cd "$PROJECT_ROOT/packages/generator"
bun run build > "$LOG_DIR/generator-build.log" 2>&1
if [ $? -ne 0 ]; then
    log_error "Build failed"
    cat "$LOG_DIR/generator-build.log"
    exit 1
fi

# Generate app
log "Generating Option 1 test app..."
rm -rf "$TEST_OUTPUT_DIR"
node dist/cli/generate.js generate \
    -i "$PROJECT_ROOT/test-data/hospital-erd.mermaid" \
    -o "$TEST_OUTPUT_DIR" \
    -n "quick-test" \
    -s option1 \
    --db sqlite \
    --no-interactive > "$LOG_DIR/generate.log" 2>&1

if [ $? -ne 0 ]; then
    log_error "Generation failed"
    cat "$LOG_DIR/generate.log"
    exit 1
fi
log_success "App generated"

# Setup database
log "Setting up database..."
cd "$TEST_OUTPUT_DIR/backend"
bun install > /dev/null 2>&1
cp .env.example .env
mkdir -p data
sed -i.bak 's/DATABASE_CLIENT=postgresql/DATABASE_CLIENT=sqlite3/' .env
sed -i.bak "s|DATABASE_FILENAME=.*|DATABASE_FILENAME=./data/quick-test.db|" .env
rm .env.bak
bun run migrate > "$LOG_DIR/migrate.log" 2>&1
bun run seed > "$LOG_DIR/seed.log" 2>&1 || true
log_success "Database ready"

# Start servers
log "Starting servers..."
killall -9 node bun 2>/dev/null || true
sleep 2

cd "$TEST_OUTPUT_DIR/backend"
bun run start:dev > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
sleep 10

cd "$TEST_OUTPUT_DIR/frontend"
bun install > /dev/null 2>&1
bun run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
sleep 15

log_success "Servers running (Backend: $BACKEND_PID, Frontend: $FRONTEND_PID)"
sleep 5

# Run E2E tests
log "Running E2E tests..."
cd "$TEST_OUTPUT_DIR/frontend"

# Create manual Playwright config
cat > playwright.config.manual.ts << 'EOF'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/pages',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3001',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
EOF

# Run tests
FRONTEND_URL=http://localhost:3001 \
./node_modules/.bin/playwright test \
    --config=playwright.config.manual.ts \
    > "$LOG_DIR/e2e.log" 2>&1

TEST_RESULT=$?

# Show results
if [ $TEST_RESULT -eq 0 ]; then
    log_success "ALL TESTS PASSED!"
else
    log_error "SOME TESTS FAILED"
    echo ""
    log "See results: $LOG_DIR/e2e.log"
    log "Playwright report: $TEST_OUTPUT_DIR/frontend/playwright-report/index.html"
fi

exit $TEST_RESULT
