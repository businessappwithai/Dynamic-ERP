#!/bin/bash
# Hospital E2E Test - Bun.js Runtime Only
# This project uses Bun.js exclusively - NO Node.js

set -e

echo "=========================================="
echo "Hospital E2E Test"
echo "Runtime: Bun.js"
echo "=========================================="

cd /Users/pramodkoshy/projects/dynamic/test/app-with-ai

# Run the test using Bun
bun run-complete-test.ts

echo ""
echo "✅ Test execution complete"
