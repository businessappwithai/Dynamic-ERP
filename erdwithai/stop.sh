#!/bin/bash

# ERDwithAI Stop Script
# This script stops all running ERDwithAI services

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# PID file locations
WEB_PID_FILE=".erdwithai-web.pid"

# Function to stop a service
stop_service() {
    local pid_file=$1
    local service_name=$2

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")

        if ps -p "$pid" > /dev/null 2>&1; then
            print_info "Stopping $service_name (PID: $pid)..."
            kill "$pid" 2>/dev/null || true

            # Wait for graceful shutdown (up to 10 seconds)
            local count=0
            while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
                echo -n "."
            done
            echo ""

            # Force kill if still running
            if ps -p "$pid" > /dev/null 2>&1; then
                print_warning "Force killing $service_name..."
                kill -9 "$pid" 2>/dev/null || true
                sleep 1
            fi

            if ps -p "$pid" > /dev/null 2>&1; then
                print_error "Failed to stop $service_name"
                return 1
            else
                print_success "Stopped $service_name"
            fi
        else
            print_warning "$service_name was not running (stale PID file)"
        fi

        rm -f "$pid_file"
    else
        print_info "$service_name is not running (no PID file found)"
    fi
}

print_header "Stopping ERDwithAI Services"

# Stop Web Server
stop_service "$WEB_PID_FILE" "Web Server"

# Also try to kill any remaining processes by pattern (fallback cleanup)
print_info "Checking for any remaining processes..."

# Kill any remaining Next.js dev processes
REMAINING_PIDS=$(pgrep -f "next dev" 2>/dev/null || true)
if [ -n "$REMAINING_PIDS" ]; then
    print_warning "Found remaining Next.js processes, cleaning up..."
    echo "$REMAINING_PIDS" | xargs kill 2>/dev/null || true
    sleep 1
fi

# Kill any bun processes running dev scripts
REMAINING_BUN=$(pgrep -f "bun.*dev" 2>/dev/null || true)
if [ -n "$REMAINING_BUN" ]; then
    print_warning "Found remaining bun dev processes, cleaning up..."
    echo "$REMAINING_BUN" | xargs kill 2>/dev/null || true
fi

print_header "Cleanup Complete"

# Final check
if pgrep -f "next dev" > /dev/null 2>&1 || pgrep -f "bun.*dev" > /dev/null 2>&1; then
    print_warning "Some processes may still be running"
    print_info "You can check with: ps aux | grep -E 'next dev|bun.*dev'"
    print_info "Or force kill with: pkill -f 'bun.*dev'"
else
    print_success "All ERDwithAI services stopped successfully"
fi

echo ""
print_info "Log files preserved (if needed for debugging):"
echo -e "  ${BLUE}erdwithai-web.log${NC}"

echo ""
