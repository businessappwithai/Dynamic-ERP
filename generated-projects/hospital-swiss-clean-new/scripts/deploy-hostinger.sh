#!/bin/bash

# Hospital Management System - Hostinger Deployment Script
# Usage: ./scripts/deploy-hostinger.sh [development|production]

set -e

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Hospital Management System Deployment${NC}"
echo -e "${GREEN}Environment: $ENVIRONMENT${NC}"
echo -e "${GREEN}======================================${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    exit 1
fi

# Load environment variables
if [ ! -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]; then
    echo -e "${YELLOW}Warning: .env.$ENVIRONMENT not found${NC}"
    echo -e "${YELLOW}Creating from example...${NC}"

    if [ -f "$PROJECT_ROOT/.env.production.example" ]; then
        cp "$PROJECT_ROOT/.env.production.example" "$PROJECT_ROOT/.env.$ENVIRONMENT"
        echo -e "${YELLOW}Created .env.$ENVIRONMENT - Please edit it with your values${NC}"
        exit 1
    fi
fi

# Load environment variables
export $(cat "$PROJECT_ROOT/.env.$ENVIRONMENT" | xargs)

# Build Docker images
echo -e "${YELLOW}Building Docker images...${NC}"
docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" build

# Pull latest images
echo -e "${YELLOW}Pulling base images...${NC}"
docker pull postgres:16-alpine
docker pull node:20-alpine

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" down || true

# Start services
echo -e "${YELLOW}Starting services...${NC}"
docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" up -d

# Wait for database to be ready
echo -e "${YELLOW}Waiting for database to be ready...${NC}"
sleep 10

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T backend npm run migrate

# Run seeds (optional)
# echo -e "${YELLOW}Seeding database...${NC}"
# docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T backend npm run seed

# Check service health
echo -e "${YELLOW}Checking service health...${NC}"
sleep 5

BACKEND_HEALTH=$(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" ps backend | grep "healthy" || echo "")
FRONTEND_HEALTH=$(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" ps frontend | grep "healthy" || echo "")
DB_HEALTH=$(docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" ps postgres | grep "healthy" || echo "")

if [ -z "$BACKEND_HEALTH" ]; then
    echo -e "${RED}Warning: Backend service may not be healthy${NC}"
fi

if [ -z "$FRONTEND_HEALTH" ]; then
    echo -e "${RED}Warning: Frontend service may not be healthy${NC}"
fi

if [ -z "$DB_HEALTH" ]; then
    echo -e "${RED}Warning: Database may not be healthy${NC}"
fi

# Display service information
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${GREEN}Services running:${NC}"
docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" ps
echo ""
echo -e "${GREEN}Access your application:${NC}"
echo -e "Frontend: http://localhost:3000"
echo -e "Backend API: http://localhost:3001/api"
echo -e "Database: localhost:5432"
echo ""
echo -e "${GREEN}Useful commands:${NC}"
echo "View logs: docker-compose -f docker-compose.prod.yml logs -f [backend|frontend|postgres]"
echo "Stop services: docker-compose -f docker-compose.prod.yml down"
echo "Restart services: docker-compose -f docker-compose.prod.yml restart"
echo ""
