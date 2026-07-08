#!/bin/bash

# Hospital Management System - Hostinger Deployment Script
# This script deploys the Next.js/NestJS HMS to Hostinger VPS

set -e  # Exit on error

# ==============================================
# Configuration
# ==============================================
SERVER_HOST="148.135.137.110"
SERVER_USER="root"
SSH_KEY="$HOME/.ssh/id_ed25519"
PROJECT_DIR="generated-projects/hospital-swiss-clean"
REMOTE_DEPLOY_DIR="/root/hospital-management-system"
PROJECT_NAME="hospital-swiss-clean"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ==============================================
# Functions
# ==============================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test SSH connection
test_ssh_connection() {
    log_info "Testing SSH connection to ${SERVER_USER}@${SERVER_HOST}..."
    if ssh -i "${SSH_KEY}" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "${SERVER_USER}@${SERVER_HOST}" "echo 'SSH connection successful'" > /dev/null 2>&1; then
        log_info "SSH connection test successful ✓"
        return 0
    else
        log_error "SSH connection test failed. Please check your credentials."
        return 1
    fi
}

# Create remote directory structure
setup_remote_directory() {
    log_info "Setting up remote deployment directory..."

    ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no "${SERVER_USER}@${SERVER_HOST}" << 'ENDSSH'
        mkdir -p /root/hospital-management-system
        mkdir -p /root/hospital-management-system/backups
        cd /root/hospital-management-system

        # Clean up unused Docker build cache to free space (safer prune)
        echo "Cleaning up unused Docker build cache..."
        docker builder prune -a -f
        echo "Cleaning up dangling images..."
        docker image prune -a -f
ENDSSH

    log_info "Remote directory created ✓"
}

# Check existing containers and preserve database
check_existing_containers() {
    log_info "Checking for existing Docker containers..."

    ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no "${SERVER_USER}@${SERVER_HOST}" << 'ENDSSH'
        # List existing containers
        echo "=== Current Docker Containers ==="
        docker ps -a | grep hospital || echo "No hospital containers found"

        # Check if postgres data volume exists
        echo ""
        echo "=== Docker Volumes ==="
        docker volume ls | grep postgres || echo "No postgres volume found"

        # Backup database if exists
        if docker ps -a | grep -q hospital-db; then
            echo ""
            echo "=== Creating Database Backup ==="
            BACKUP_DIR="/root/hospital-management-system/backups"
            BACKUP_FILE="$BACKUP_DIR/db-backup-$(date +%Y%m%d-%H%M%S).sql"

            mkdir -p "$BACKUP_DIR"
            docker exec hospital-db pg_dump -U postgres hospital_management_system > "$BACKUP_FILE" 2>/dev/null || echo "Could not create backup (container might not be running)"
            echo "Backup saved to: $BACKUP_FILE"
        fi
ENDSSH

    log_info "Container check complete ✓"
}

# Stop and remove existing containers (preserve volumes)
remove_existing_containers() {
    log_info "Stopping and removing existing containers (preserving database volumes)..."

    ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no "${SERVER_USER}@${SERVER_HOST}" << 'ENDSSH'
        cd /root/hospital-management-system

        # Stop and remove containers but preserve volumes
        docker compose down --remove-orphans 2>/dev/null || true

        # Also try removing individual containers if docker compose didn't work
        docker stop hospital-nginx hospital-backend hospital-frontend hospital-db 2>/dev/null || true
        docker rm hospital-nginx hospital-backend hospital-frontend hospital-db 2>/dev/null || true

        echo "Containers removed (volumes preserved)"
ENDSSH

    log_info "Existing containers removed ✓"
}

# Transfer project files to server
transfer_project_files() {
    log_info "Transferring project files to server..."

    # Create a temporary directory with only necessary files
    TEMP_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_DIR" EXIT

    # Copy necessary files to temp directory
    log_info "Preparing deployment package..."
    mkdir -p "$TEMP_DIR/$PROJECT_NAME"

    # Copy backend
    cd "$PROJECT_DIR"
    rsync -av --exclude='node_modules' \
              --exclude='dist' \
              --exclude='*.log' \
              --exclude='.env.local' \
              --exclude='test-results' \
              --exclude='tests' \
              backend/ "$TEMP_DIR/$PROJECT_NAME/backend/"

    # Copy frontend
    rsync -av --exclude='node_modules' \
              --exclude='.next' \
              --exclude='out' \
              --exclude='*.log' \
              frontend/ "$TEMP_DIR/$PROJECT_NAME/frontend/"

    # Copy docker and deployment files
    cp docker-compose.yml "$TEMP_DIR/$PROJECT_NAME/"
    cp -r scripts "$TEMP_DIR/$PROJECT_NAME/"

    # Transfer to server
    log_info "Uploading to server (this may take a while)..."
    rsync -avz -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
              "$TEMP_DIR/$PROJECT_NAME/" \
              "${SERVER_USER}@${SERVER_HOST}:${REMOTE_DEPLOY_DIR}/"

    log_info "Files transferred successfully ✓"
}

# Build and start containers on server
build_and_start_containers() {
    log_info "Building and starting Docker containers on server..."

    ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no "${SERVER_USER}@${SERVER_HOST}" << ENDSSH
        cd ${REMOTE_DEPLOY_DIR}

        # Copy environment file
        cp scripts/docker/.env.production .env

        # Pull latest images
        echo "Pulling latest Docker images..."
        docker compose pull

        # Build containers
        echo "Building containers (this may take 10-15 minutes)..."
        docker compose build --no-cache

        # Start containers
        echo "Starting containers..."
        docker compose up -d

        # Wait for services to be healthy
        echo "Waiting for services to start..."
        sleep 30

        # Check container status
        echo ""
        echo "=== Container Status ==="
        docker compose ps
ENDSSH

    log_info "Containers built and started ✓"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."

    ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no "${SERVER_USER}@${SERVER_HOST}" << 'ENDSSH'
        cd /root/hospital-management-system

        echo "=== Checking Container Health ==="
        docker compose ps

        echo ""
        echo "=== Recent Container Logs ==="
        echo "--- Backend Logs ---"
        docker compose logs --tail=20 backend
        echo ""
        echo "--- Frontend Logs ---"
        docker compose logs --tail=20 frontend
        echo ""
        echo "--- Database Logs ---"
        docker compose logs --tail=10 postgres

        echo ""
        echo "=== Testing API Endpoint ==="
        curl -s http://localhost/api/health || echo "API health check failed"
ENDSSH

    log_info "Deployment verification complete ✓"
}

# ==============================================
# Main Deployment Flow
# ==============================================
main() {
    log_info "=========================================="
    log_info "Hospital Management System Deployment"
    log_info "Target: ${SERVER_HOST}"
    log_info "=========================================="
    echo ""

    # Step 1: Test SSH connection
    if ! test_ssh_connection; then
        log_error "Cannot proceed with deployment. SSH connection failed."
        exit 1
    fi
    echo ""

    # Step 2: Setup remote directory
    setup_remote_directory
    echo ""

    # Step 3: Check existing containers
    check_existing_containers
    echo ""

    # Step 4: Remove existing containers
    read -p "$(echo -e ${YELLOW}Do you want to stop and remove existing containers? [y/N]: ${NC})" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        remove_existing_containers
    else
        log_warn "Skipping container removal."
    fi
    echo ""

    # Step 5: Transfer files
    transfer_project_files
    echo ""

    # Step 6: Build and start containers
    build_and_start_containers
    echo ""

    # Step 7: Verify deployment
    verify_deployment
    echo ""

    log_info "=========================================="
    log_info "Deployment Complete!"
    log_info "=========================================="
    log_info "Your application should be available at:"
    log_info "  http://${SERVER_HOST}"
    log_info ""
    log_info "To view logs:"
    log_info "  ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} 'cd ${REMOTE_DEPLOY_DIR} && docker compose logs -f'"
    log_info "=========================================="
}

# Run main function
main
