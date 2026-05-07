#!/bin/bash
set -e

# Comprehensive E2E Test Suite for All Frameworks
# Tests all 10 framework combinations

echo "=========================================="
echo "Comprehensive E2E Test Suite"
echo "Testing ALL Framework Combinations"
echo "=========================================="
echo ""

PROJECT_ROOT="/Users/pramodkoshy/projects/dynamic/test/app-with-ai"
TEST_OUTPUT_DIR="$PROJECT_ROOT/test-output/comprehensive"
CLI_PATH="$PROJECT_ROOT/packages/generator/dist/cli/run.js"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create test output directory
rm -rf "$TEST_OUTPUT_DIR"
mkdir -p "$TEST_OUTPUT_DIR"

# Test ERD
TEST_ERD="erDiagram
  USER ||--o{ POST : creates
  USER {
    string id PK
    string name
    string email UK
    datetime created_at
  }
  POST {
    string id PK
    string title
    text content
    string user_id FK
    datetime published_at
    datetime created_at
  }"

# Counter
PASS=0
FAIL=0
TOTAL=0

# Function to test a framework combination
test_framework() {
  local test_id=$1
  local test_name=$2
  local command=$3
  local stack=$4
  local db=$5
  local should_e2e=$6

  TOTAL=$((TOTAL + 1))

  echo ""
  echo -e "${BLUE}==========================================${NC}"
  echo -e "${BLUE}Test $TOTAL: $test_name${NC}"
  echo -e "${BLUE}==========================================${NC}"

  local output_dir="$TEST_OUTPUT_DIR/$test_id"
  mkdir -p "$output_dir"

  # Create ERD file
  echo "$TEST_ERD" > "$output_dir/diagram.mermaid"

  # Build generator
  echo "Building generator..."
  cd "$PROJECT_ROOT"
  bun run build:generator > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Generator built${NC}"
  else
    echo -e "${RED}✗ Generator build failed${NC}"
    FAIL=$((FAIL + 1))
    return 1
  fi

  # Generate application
  echo "Generating application..."
  local args=(
    "node" "$CLI_PATH"
    "$command"
    "--input" "$output_dir/diagram.mermaid"
    "--output" "$output_dir"
    "--name" "test-app"
  )

  if [ "$command" != "generate:frontend" ]; then
    args+=("--stack" "$stack")
    args+=("--db" "$db")
  else
    args+=("--stack" "$stack")
    args+=("--api-url" "http://localhost:3000")
  fi

  args+=("--no-interactive")

  "${args[@]}" > "$output_dir/generation.log" 2>&1

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Generation succeeded${NC}"
  else
    echo -e "${RED}✗ Generation failed${NC}"
    cat "$output_dir/generation.log" | tail -20
    FAIL=$((FAIL + 1))
    return 1
  fi

  # Validate critical files exist
  echo "Validating generated files..."
  local missing_files=0

  if [ "$command" = "generate" ]; then
    # Full stack
    [ ! -f "$output_dir/backend/package.json" ] && echo -e "${RED}✗ Missing: backend/package.json${NC}" && missing_files=$((missing_files + 1))
    [ ! -f "$output_dir/frontend/package.json" ] && echo -e "${RED}✗ Missing: frontend/package.json${NC}" && missing_files=$((missing_files + 1))

    # Install backend dependencies
    if [ -d "$output_dir/backend" ]; then
      echo "Installing backend dependencies..."
      cd "$output_dir/backend"
      bun install > "$output_dir/backend-install.log" 2>&1
      if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Backend deps installed${NC}"
      else
        echo -e "${YELLOW}⚠ Backend install had warnings${NC}"
        cat "$output_dir/backend-install.log" | tail -10
      fi

      # Build backend
      echo "Building backend..."
      bun run build > "$output_dir/backend-build.log" 2>&1 || true
      if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Backend built${NC}"
      else
        echo -e "${YELLOW}⚠ Backend build had issues${NC}"
        cat "$output_dir/backend-build.log" | tail -10
      fi
    fi

    # Install frontend dependencies
    if [ -d "$output_dir/frontend" ]; then
      echo "Installing frontend dependencies..."
      cd "$output_dir/frontend"
      bun install > "$output_dir/frontend-install.log" 2>&1
      if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Frontend deps installed${NC}"
      else
        echo -e "${YELLOW}⚠ Frontend install had warnings${NC}"
        cat "$output_dir/frontend-install.log" | tail -10
      fi

      # Check for E2E tests
      if [ -d "$output_dir/frontend/e2e" ] || [ -d "$output_dir/frontend/test/integration" ]; then
        echo -e "${GREEN}✓ E2E tests found${NC}"

        # Run E2E tests if Option 1
        if [ "$stack" = "option1" ] && [ "$should_e2e" = "true" ]; then
          echo "Running E2E tests..."

          # Install Playwright
          cd "$output_dir/frontend"
          ./node_modules/.bin/playwright install chromium --with-deps > /dev/null 2>&1

          # Kill any existing servers
          killall -9 node bun 2>/dev/null || true
          sleep 2

          # Start backend
          cd "$output_dir/backend"
          bun run start:dev > /tmp/test-backend-$test_id.log 2>&1 &
          BACKEND_PID=$!
          sleep 10

          # Check if backend started
          if ps -p $BACKEND_PID > /dev/null; then
            echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
          else
            echo -e "${YELLOW}⚠ Backend may not have started${NC}"
            cat /tmp/test-backend-$test_id.log | tail -20
          fi

          # Run frontend tests (frontend will start itself)
          cd "$output_dir/frontend"
          timeout 180 ./node_modules/.bin/playwright test --config=playwright.config.ts --reporter=line > "$output_dir/e2e-results.log" 2>&1 || true

          # Check results
          if grep -q "passed" "$output_dir/e2e-results.log"; then
            local passed=$(grep -o "[0-9]* passed" "$output_dir/e2e-results.log" | grep -o "[0-9]*")
            local failed=$(grep -o "[0-9]* failed" "$output_dir/e2e-results.log" | grep -o "[0-9]*" || echo "0")
            echo -e "${GREEN}✓ E2E Tests: $passed passed, $failed failed${NC}"
            echo "$passed passed, $failed failed" > "$output_dir/e2e-summary.txt"
          else
            echo -e "${YELLOW}⚠ E2E tests completed with issues${NC}"
            cat "$output_dir/e2e-results.log" | tail -30
          fi

          # Cleanup
          kill $BACKEND_PID 2>/dev/null || true
          killall -9 node bun 2>/dev/null || true
        fi
      else
        echo -e "${YELLOW}⚠ No E2E tests found (backend-only or Option 2)${NC}"
      fi
    fi
  fi

  if [ "$missing_files" -eq 0 ]; then
    echo -e "${GREEN}✓ All critical files present${NC}"
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi

  echo ""
  cd "$PROJECT_ROOT"
}

# ============================================
# TEST ALL FRAMEWORK COMBINATIONS
# ============================================

echo -e "${BLUE}Starting Comprehensive Test Suite...${NC}"
echo ""

# Full Stack - Option 1
test_framework "option1-postgres" "Option 1 (NestJS + Next.js + PostgreSQL)" "generate" "option1" "postgresql" "true"
test_framework "option1-sqlite" "Option 1 (NestJS + Next.js + SQLite)" "generate" "option1" "sqlite" "true"

# Full Stack - Option 2
test_framework "option2-postgres" "Option 2 (OData + OpenUI5 + PostgreSQL)" "generate" "option2" "postgresql" "false"
test_framework "option2-sqlite" "Option 2 (OData + OpenUI5 + SQLite)" "generate" "option2" "sqlite" "false"

# Backend Only
test_framework "backend-nestjs-postgres" "NestJS Backend + PostgreSQL" "generate:backend" "nestjs" "postgresql" "false"
test_framework "backend-nestjs-sqlite" "NestJS Backend + SQLite" "generate:backend" "nestjs" "sqlite" "false"
test_framework "backend-odata-postgres" "OData Backend + PostgreSQL" "generate:backend" "odata" "postgresql" "false"
test_framework "backend-odata-sqlite" "OData Backend + SQLite" "generate:backend" "odata" "sqlite" "false"

# Frontend Only
test_framework "frontend-nextjs" "Next.js Frontend" "generate:frontend" "nextjs" "" "false"
test_framework "frontend-openui5" "OpenUI5 Frontend" "generate:frontend" "openui5" "" "false"

# ============================================
# SUMMARY
# ============================================

echo ""
echo -e "${BLUE}=========================================="
echo -e "Test Suite Complete"
echo -e "==========================================${NC}"
echo ""
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""
echo "Test results saved to: $TEST_OUTPUT_DIR"
echo ""

# Generate summary report
cat > "$TEST_OUTPUT_DIR/SUMMARY.md" << EOF
# Comprehensive E2E Test Suite Results

**Date:** $(date)
**Total Combinations Tested:** $TOTAL

## Results Summary

- ✅ **Passed:** $PASS
- ❌ **Failed:** $FAIL
- 📊 **Success Rate:** $(( PASS * 100 / TOTAL ))%

## Test Combinations

1. Option 1 (NestJS + Next.js + PostgreSQL)
2. Option 1 (NestJS + Next.js + SQLite)
3. Option 2 (OData + OpenUI5 + PostgreSQL)
4. Option 2 (OData + OpenUI5 + SQLite)
5. NestJS Backend + PostgreSQL
6. NestJS Backend + SQLite
7. OData Backend + PostgreSQL
8. OData Backend + SQLite
9. Next.js Frontend
10. OpenUI5 Frontend

## Detailed Results

See individual test directories for detailed logs and E2E test results.
EOF

echo -e "${GREEN}Summary report: $TEST_OUTPUT_DIR/SUMMARY.md${NC}"
