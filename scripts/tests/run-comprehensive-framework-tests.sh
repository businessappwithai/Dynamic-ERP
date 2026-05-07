#!/bin/bash

################################################################################
# Comprehensive Framework E2E Test Runner
#
# Tests all framework/database combinations
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
TESTS_DIR="$PROJECT_ROOT/tests"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$TESTS_DIR/test-results/comprehensive-test-report-$TIMESTAMP.md"

# Test matrix
STACKS=("option1" "option2")
DATABASES=("sqlite")

# Results tracking
declare -a TEST_RESULTS=()
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Parse command line arguments
SKIP_BUILD=false
KEEP_OUTPUT=false
TEST_ONLY_STACK=""
TEST_ONLY_DB=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --option1) TEST_ONLY_STACK="option1"; shift ;;
        --option2) TEST_ONLY_STACK="option2"; shift ;;
        --sqlite) TEST_ONLY_DB="sqlite"; shift ;;
        --postgres) TEST_ONLY_DB="postgresql"; shift ;;
        --skip-build) SKIP_BUILD=true; shift ;;
        --keep-output) KEEP_OUTPUT=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Create results directory
mkdir -p "$(dirname "$REPORT_FILE")"

# Initialize report
echo "# Comprehensive Framework E2E Test Report" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Date:** $(date)" >> "$REPORT_FILE"
echo "**Test Run ID:** $TIMESTAMP" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Build Generator
echo "=========================================="
echo "Building Generator"
echo "=========================================="
echo ""

if [ "$SKIP_BUILD" = false ]; then
    echo -e "${BLUE}[INFO]${NC} Building generator..."
    cd "$PROJECT_ROOT/packages/generator"
    bun run build > /tmp/generator-build.log 2>&1 || {
        echo -e "${RED}[ERROR]${NC} Generator build failed"
        exit 1
    }
    echo -e "${GREEN}[SUCCESS]${NC} Generator built"
fi

# Run Tests
echo ""
echo "=========================================="
echo "Running E2E Tests"
echo "=========================================="
echo ""

for STACK in "${STACKS[@]}"; do
    if [ -n "$TEST_ONLY_STACK" ] && [ "$STACK" != "$TEST_ONLY_STACK" ]; then
        continue
    fi

    for DATABASE in "${DATABASES[@]}"; do
        if [ -n "$TEST_ONLY_DB" ] && [ "$DATABASE" != "$TEST_ONLY_DB" ]; then
            continue
        fi

        TEST_NAME="$STACK-$DATABASE"
        TOTAL_TESTS=$((TOTAL_TESTS + 1))

        echo -e "${BLUE}[INFO]${NC} Testing: $TEST_NAME"

        TEST_DIR="$TESTS_DIR/$STACK/e2e-tests"

        if [ -d "$TEST_DIR" ]; then
            cd "$PROJECT_ROOT"

            if bun playwright test "$TEST_DIR" --reporter=line > /tmp/test-$TEST_NAME.log 2>&1; then
                echo -e "${GREEN}[SUCCESS]${NC} $TEST_NAME passed"
                PASSED_TESTS=$((PASSED_TESTS + 1))
                TEST_RESULTS+=("✅ $TEST_NAME: PASSED")
                echo "- ✅ **$TEST_NAME**: All tests passed" >> "$REPORT_FILE"
            else
                echo -e "${RED}[ERROR]${NC} $TEST_NAME failed"
                FAILED_TESTS=$((FAILED_TESTS + 1))
                TEST_RESULTS+=("❌ $TEST_NAME: FAILED")
                echo "- ❌ **$TEST_NAME**: Tests failed" >> "$REPORT_FILE"
            fi
        else
            echo -e "${YELLOW}[WARNING]${NC} Test directory not found: $TEST_DIR"
        fi
    done
done

# Print Summary
echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo ""

for result in "${TEST_RESULTS[@]}"; do
    echo "$result"
done

# Final report
echo "" >> "$REPORT_FILE"
echo "## Summary" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "- **Total Tests:** $TOTAL_TESTS" >> "$REPORT_FILE"
echo "- **Passed:** $PASSED_TESTS" >> "$REPORT_FILE"
echo "- **Failed:** $FAILED_TESTS" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Detailed Results" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

for result in "${TEST_RESULTS[@]}"; do
    echo "- $result" >> "$REPORT_FILE"
done

echo ""
echo -e "${GREEN}[SUCCESS]${NC} Test report: $REPORT_FILE"

if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
fi
