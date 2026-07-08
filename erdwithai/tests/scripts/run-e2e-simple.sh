#!/bin/bash
set -e

echo "=========================================="
echo "Running Playwright E2E Tests (Simple)"
echo "=========================================="
echo ""

PROJECT_ROOT="/Users/pramodkoshy/projects/dynamic/test/app-with-ai/test-output/blog-app"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Kill any existing processes
echo "Cleaning up existing processes..."
killall -9 node bun 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 5

# Start backend
echo ""
echo "Starting backend server..."
cd "$BACKEND_DIR"
nohup bun run start:dev > /tmp/backend-e2e.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 10

# Check backend
if ! ps -p $BACKEND_PID > /dev/null; then
    echo "❌ Backend failed to start"
    cat /tmp/backend-e2e.log
    exit 1
fi
echo "✓ Backend started on port 3000"

# Start frontend
echo ""
echo "Starting frontend server..."
cd "$FRONTEND_DIR"
nohup bun run dev > /tmp/frontend-e2e.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
sleep 15

# Check frontend
if ! ps -p $FRONTEND_PID > /dev/null; then
    echo "❌ Frontend failed to start"
    cat /tmp/frontend-e2e.log
    exit 1
fi
echo "✓ Frontend started on port 3001"

# Wait a bit more for servers to stabilize
sleep 5

echo ""
echo "Servers running:"
echo "  Backend:  PID=$BACKEND_PID (port 3000)"
echo "  Frontend: PID=$FRONTEND_PID (port 3001)"
echo ""

# Run Playwright tests (without webServer)
cd "$FRONTEND_DIR"
echo "Running Playwright tests..."
echo "=========================================="

# Use config without webServer
./node_modules/.bin/playwright test --config=playwright.config.no-webserver.ts

TEST_EXIT_CODE=$?

# Cleanup
echo ""
echo "=========================================="
echo "Cleaning up..."
kill $BACKEND_PID 2>/dev/null || true
kill $FRONTEND_PID 2>/dev/null || true
killall -9 node bun 2>/dev/null || true

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✓ All tests passed!"
else
    echo "❌ Some tests failed (exit code: $TEST_EXIT_CODE)"
fi

echo "=========================================="

exit $TEST_EXIT_CODE
