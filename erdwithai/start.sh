#!/bin/bash

# ERDwithAI Start Script
# This script starts the development server with proper PID tracking

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

# Function to check if process is running
is_running() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0  # Process is running
        else
            rm -f "$pid_file"  # Clean up stale PID file
            return 1  # Process is not running
        fi
    fi
    return 1  # PID file doesn't exist
}

# Function to kill existing process
kill_existing() {
    local pid_file=$1
    local service_name=$2

    if is_running "$pid_file"; then
        local pid=$(cat "$pid_file")
        print_warning "Stopping existing $service_name process (PID: $pid)..."
        kill "$pid" 2>/dev/null || true
        sleep 2

        # Force kill if still running
        if ps -p "$pid" > /dev/null 2>&1; then
            print_warning "Force killing $service_name process..."
            kill -9 "$pid" 2>/dev/null || true
        fi

        rm -f "$pid_file"
        print_success "Stopped existing $service_name process"
    fi
}

print_header "Starting ERDwithAI"

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    print_error "Bun.js is not installed"
    print_info "Install Bun.js: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

print_info "Bun.js version: $(bun --version)"

# Check if packages are installed
if [ ! -d "node_modules" ]; then
    print_warning "Dependencies not installed. Running bun install..."
    bun install
fi

# Check if web package is built
if [ ! -d "packages/web/.next" ]; then
    print_warning "Web package not built. Building..."
    bun run build:web
fi

# Kill any existing processes
kill_existing "$WEB_PID_FILE" "Web Server"

# Start Web Server
print_header "Starting Web Server"

print_info "Starting Next.js development server..."
nohup bun run dev > erdwithai-web.log 2>&1 &
WEB_PID=$!
echo $WEB_PID > "$WEB_PID_FILE"

# Wait for the server to start
print_info "Waiting for server to start..."
sleep 5

if is_running "$WEB_PID_FILE"; then
    print_success "Web server started successfully"
    print_info "PID: $WEB_PID"

    # Try to detect the port from the log
    if [ -f "erdwithai-web.log" ]; then
        # Give it another moment if port not in log yet
        PORT=$(grep -oP 'Local:.*http://localhost:\K\d+' erdwithai-web.log | head -1 | grep -oP '\d+$' || echo "")
        if [ -z "$PORT" ]; then
            PORT=3000  # Default port
        fi
        print_success "Web server running at: ${BLUE}http://localhost:$PORT${NC}"
    else
        print_info "Web server running at: ${BLUE}http://localhost:3000${NC} (default)"
    fi
    echo ""
    print_info "Dashboard: ${BLUE}http://localhost:3000/dashboard${NC}"
    print_info "Designer: ${BLUE}http://localhost:3000/designer${NC}"
else
    print_error "Failed to start web server"
    print_info "Check erdwithai-web.log for details:"
    echo "  tail -50 erdwithai-web.log"
    exit 1
fi

# Final Summary
print_header "Services Running"

echo -e "${GREEN}✓${NC} Web Server (PID: $WEB_PID)"
echo -e "${GREEN}✓${NC} Status: Running at http://localhost:3000"

echo ""
print_info "Logs:"
echo -e "  ${BLUE}Web:${NC}    tail -f erdwithai-web.log"
echo ""

print_info "To stop the server, run:"
echo -e "  ${GREEN}./stop.sh${NC}"

echo ""
print_info "To view logs in real-time:"
echo -e "  ${BLUE}tail -f erdwithai-web.log${NC}"

echo ""
