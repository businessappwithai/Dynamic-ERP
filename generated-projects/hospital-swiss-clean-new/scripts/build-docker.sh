#!/bin/bash

# Build Docker images for Hospital Management System
# Usage: ./scripts/build-docker.sh [--push] [--tag latest|<version>]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PUSH=false
TAG="latest"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --push)
            PUSH=true
            shift
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--push] [--tag latest|<version>]"
            exit 1
            ;;
    esac
done

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Building Docker Images${NC}"
echo -e "${GREEN}Tag: $TAG${NC}"
echo -e "${GREEN}Push to Registry: $PUSH${NC}"
echo -e "${GREEN}======================================${NC}"

cd "$PROJECT_ROOT"

# Build images
echo -e "${YELLOW}Building backend image...${NC}"
docker build -t hospital-backend:$TAG --target backend-prod .
docker build -t hospital-backend:latest --target backend-prod .

echo -e "${YELLOW}Building frontend image...${NC}"
docker build -t hospital-frontend:$TAG --target frontend-prod .
docker build -t hospital-frontend:latest --target frontend-prod .

# Display built images
echo -e "${GREEN}Built images:${NC}"
docker images | grep hospital

# Push to Docker Hub (optional)
if [ "$PUSH" = true ]; then
    # Get Docker Hub username
    read -p "Enter Docker Hub username: " DOCKER_USER

    echo -e "${YELLOW}Pushing images to Docker Hub...${NC}"

    # Tag images for Docker Hub
    docker tag hospital-backend:$TAG $DOCKER_USER/hospital-backend:$TAG
    docker tag hospital-backend:latest $DOCKER_USER/hospital-backend:latest
    docker tag hospital-frontend:$TAG $DOCKER_USER/hospital-frontend:$TAG
    docker tag hospital-frontend:latest $DOCKER_USER/hospital-frontend:latest

    # Push images
    docker push $DOCKER_USER/hospital-backend:$TAG
    docker push $DOCKER_USER/hospital-backend:latest
    docker push $DOCKER_USER/hospital-frontend:$TAG
    docker push $DOCKER_USER/hospital-frontend:latest

    echo -e "${GREEN}Images pushed to:${NC}"
    echo "  $DOCKER_USER/hospital-backend:$TAG"
    echo "  $DOCKER_USER/hospital-backend:latest"
    echo "  $DOCKER_USER/hospital-frontend:$TAG"
    echo "  $DOCKER_USER/hospital-frontend:latest"
fi

echo -e "${GREEN}Build complete!${NC}"
