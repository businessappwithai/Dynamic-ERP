#!/bin/bash

# Health check for Hospital Management System
# Usage: ./scripts/health-check.sh [compose-file]

COMPOSE_FILE=${1:-docker-compose.prod.yml}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}======================================${NC}"
echo -e "${YELLOW}Hospital Services Health Check${NC}"
echo -e "${YELLOW}======================================${NC}"

cd "$PROJECT_ROOT"

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Check services status
echo ""
echo -e "${YELLOW}Service Status:${NC}"
docker-compose -f "$COMPOSE_FILE" ps

# Check backend API
echo ""
echo -e "${YELLOW}Backend API Health:${NC}"
if curl -s -f http://localhost:3001/api/bus/patient?limit=1 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend API responding${NC}"

    # Get backend version
    BACKEND_VERSION=$(curl -s http://localhost:3001/api/bus/patient?limit=1 | jq -r '.data[0].created_at' 2>/dev/null || echo "N/A")
    echo "  Status: Healthy"
else
    echo -e "${RED}✗ Backend API not responding${NC}"
fi

# Check frontend
echo ""
echo -e "${YELLOW}Frontend Health:${NC}"
if curl -s -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend responding${NC}"
    echo "  Status: Healthy"
else
    echo -e "${RED}✗ Frontend not responding${NC}"
fi

# Check database
echo ""
echo -e "${YELLOW}Database Health:${NC}"

# Load environment
export $(cat ".env.production" | xargs 2>/dev/null || echo "")

if docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U ${DB_USER:-hospital_admin} -d ${DB_NAME:-hospital-swiss-clean} -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL responding${NC}"

    # Get database stats
    PATIENT_COUNT=$(docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U ${DB_USER:-hospital_admin} -d ${DB_NAME:-hospital-swiss-clean} -t -c "SELECT COUNT(*) FROM bus_patient;" 2>/dev/null || echo "N/A")
    echo "  Status: Healthy"
    echo "  Patient Records: $PATIENT_COUNT"
else
    echo -e "${RED}✗ PostgreSQL not responding${NC}"
fi

# Check disk space
echo ""
echo -e "${YELLOW}Disk Usage:${NC}"
DISK_USAGE=$(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $5}')
echo "  Used: $DISK_USAGE"

# Check Docker resource usage
echo ""
echo -e "${YELLOW}Container Resource Usage:${NC}"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Summary
echo ""
echo -e "${GREEN}======================================${NC}"
echo "Health check completed at $(date)"
echo -e "${GREEN}======================================${NC}"
