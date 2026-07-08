#!/bin/bash
set -e

echo "Running E2E Tests for Option 1 SQLite..."

PROJECT_ROOT="/Users/pramodkoshy/projects/dynamic/test/app-with-ai"
TEST_APP="$PROJECT_ROOT/test-output/comprehensive/option1-sqlite"

# Kill any existing processes
killall -9 node bun 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 5

# Start backend
echo "Starting backend..."
cd "$TEST_APP/backend"
bun run start:dev > /tmp/e2e-backend.log 2>&1 &
BACKEND_PID=$!
sleep 10

# Check backend
if ps -p $BACKEND_PID > /dev/null; then
    echo "✓ Backend started (PID: $BACKEND_PID)"
else
    echo "✗ Backend failed to start"
    cat /tmp/e2e-backend.log
    exit 1
fi

# Start frontend
echo "Starting frontend..."
cd "$TEST_APP/frontend"
bun run dev > /tmp/e2e-frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 15

# Check frontend
if ps -p $FRONTEND_PID > /dev/null; then
    echo "✓ Frontend started (PID: $FRONTEND_PID)"
else
    echo "⚠ Frontend may have issues (continuing anyway)"
    tail -20 /tmp/e2e-frontend.log
fi

# Wait a bit more for servers to be ready
sleep 5

# Run E2E tests with manual config
echo "Running E2E tests..."
cd "$TEST_APP/frontend"
./node_modules/.bin/playwright test --config=playwright.config.manual.ts --reporter=line > "$TEST_APP/e2e-final-results.log" 2>&1

TEST_EXIT_CODE=$?

# Cleanup
echo ""
echo "Cleaning up..."
kill $BACKEND_PID 2>/dev/null || true
kill $FRONTEND_PID 2>/dev/null || true
killall -9 node bun 2>/dev/null || true

echo ""
echo "=========================================="
echo "E2E Test Results"
echo "=========================================="
cat "$TEST_APP/e2e-final-results.log"
echo ""

exit $TEST_EXIT_CODE
EOF
chmod +x /Users/pramodkoshy/projects/dynamic/test/app-with-ai/run-option1-full.sh