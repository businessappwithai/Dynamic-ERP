#!/bin/bash

# Run E2E tests with the dev server
# This script starts the dev server in background, runs tests, then cleans up

set -e

echo "=========================================="
echo "Running E2E Tests with Dev Server"
echo "=========================================="

# Kill any existing dev server
echo "Stopping any existing dev server..."
pkill -f "bun.*dev" || true
sleep 2

# Start dev server in background
echo "Starting dev server..."
bun run dev > /tmp/dev-server.log 2>&1 &
DEV_SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
for i in {1..60}; do
  if curl -s http://localhost:3002 > /dev/null 2>&1 || curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "Server is ready!"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "Server failed to start within 60 seconds"
    cat /tmp/dev-server.log
    exit 1
  fi
  sleep 1
done

# Run the tests
echo "Running E2E tests..."
bun test test/comprehensive-e2e.test.ts
TEST_EXIT_CODE=$?

# Kill the dev server
echo "Stopping dev server..."
kill $DEV_SERVER_PID 2>/dev/null || true
pkill -f "bun.*dev" || true

# Exit with test exit code
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✓ All E2E tests passed!"
else
  echo "✗ Some E2E tests failed"
fi

exit $TEST_EXIT_CODE
