#!/bin/bash

# Quick start Docker services locally
# Usage: ./scripts/docker-start.sh [production|development]

set -e

ENVIRONMENT=${1:-development}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Starting Hospital Services${NC}"
echo -e "${GREEN}Environment: $ENVIRONMENT${NC}"
echo -e "${GREEN}======================================${NC}"

cd "$PROJECT_ROOT"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker daemon is not running${NC}"
    exit 1
fi

# Select compose file
if [ "$ENVIRONMENT" = "production" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
else
    COMPOSE_FILE="docker-compose.prod.yml"
fi

# Check if environment file exists
if [ ! -f ".env.$ENVIRONMENT" ]; then
    echo -e "${YELLOW}Creating .env.$ENVIRONMENT from example...${NC}"
    if [ -f ".env.production.example" ]; then
        cp ".env.production.example" ".env.$ENVIRONMENT"
        echo -e "${YELLOW}Created .env.$ENVIRONMENT${NC}"
        echo -e "${YELLOW}Please edit it with your configuration values${NC}"
        exit 1
    fi
fi

# Load environment variables
export $(cat ".env.$ENVIRONMENT" | xargs 2>/dev/null || true)

# Build images if they don't exist
echo -e "${YELLOW}Checking Docker images...${NC}"
if ! docker images --quiet hospital-backend | grep -q .; then
    echo -e "${YELLOW}Building images...${NC}"
    docker-compose -f "$COMPOSE_FILE" build
fi

# Start services
echo -e "${YELLOW}Starting containers...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
if docker-compose -f "$COMPOSE_FILE" exec -T backend npm run migrate > /dev/null 2>&1; then
    echo -e "${GREEN}Migrations completed successfully${NC}"
else
    echo -e "${YELLOW}Note: Migrations may not be configured or already applied${NC}"
fi

# Display service status
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Services Started!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
docker-compose -f "$COMPOSE_FILE" ps
echo ""

# Test services
echo -e "${GREEN}Testing services...${NC}"

# Test backend
if curl -s http://localhost:3001/api/bus/patient?limit=1 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend API is running${NC}"
else
    echo -e "${RED}✗ Backend API is not responding${NC}"
fi

# Test frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${RED}✗ Frontend is not responding${NC}"
fi

# Test database
if docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U ${DB_USER:-hospital_admin} -d ${DB_NAME:-hospital-swiss-clean} -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database is running${NC}"
else
    echo -e "${RED}✗ Database is not responding${NC}"
fi

echo ""
echo -e "${GREEN}Access your application:${NC}"
echo "  Frontend: ${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
echo "  API: ${NEXT_PUBLIC_API_URL:-http://localhost:3001/api}"
echo "  Database: localhost:5432"
echo ""
echo -e "${GREEN}Useful commands:${NC}"
echo "  View logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "  Stop services: docker-compose -f $COMPOSE_FILE down"
echo "  Restart services: docker-compose -f $COMPOSE_FILE restart"
echo "  View database: docker-compose -f $COMPOSE_FILE exec postgres psql -U ${DB_USER:-hospital_admin} -d ${DB_NAME:-hospital-swiss-clean}"
echo ""
