#!/bin/bash
set -e

echo "=========================================="
echo "Running Playwright E2E Tests"
echo "=========================================="
echo ""

PROJECT_ROOT="/Users/pramodkoshy/projects/dynamic/test/app-with-ai/test-output/blog-app"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Kill any existing processes
echo "Cleaning up existing processes..."
killall -9 node bun 2>/dev/null || true
sleep 3

# Start backend
echo "Starting backend server..."
cd "$BACKEND_DIR"
bun run start:dev > /tmp/backend-e2e.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 10

# Check if backend is running
if ! ps -p $BACKEND_PID > /dev/null; then
    echo "❌ Backend failed to start"
    cat /tmp/backend-e2e.log
    exit 1
fi

echo "✓ Backend started"
tail -20 /tmp/backend-e2e.log

# Run Playwright tests
echo ""
echo "Running Playwright tests..."
cd "$FRONTEND_DIR"
./node_modules/.bin/playwright test --reporter=line

TEST_EXIT_CODE=$?

# Cleanup
echo ""
echo "Cleaning up..."
kill $BACKEND_PID 2>/dev/null || true
killall -9 node bun 2>/dev/null || true

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✓ All tests passed!"
else
    echo "❌ Some tests failed"
fi

exit $TEST_EXIT_CODE
