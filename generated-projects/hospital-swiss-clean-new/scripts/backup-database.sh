#!/bin/bash

# Database backup script for Hospital Management System
# Usage: ./scripts/backup-database.sh [backup-dir] [compose-file]

BACKUP_DIR=${1:-./.backups}
COMPOSE_FILE=${2:-docker-compose.prod.yml}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Database Backup${NC}"
echo -e "${GREEN}======================================${NC}"

cd "$PROJECT_ROOT"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Load environment
export $(cat ".env.production" | xargs 2>/dev/null || echo "")

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/hospital-backup_$TIMESTAMP.sql"

echo -e "${YELLOW}Creating backup...${NC}"
echo "Backup file: $BACKUP_FILE"

# Create backup
if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump \
    -U ${DB_USER:-hospital_admin} \
    -d ${DB_NAME:-hospital-swiss-clean} \
    --verbose > "$BACKUP_FILE" 2>&1; then

    # Compress backup
    echo -e "${YELLOW}Compressing backup...${NC}"
    gzip "$BACKUP_FILE"
    BACKUP_FILE="$BACKUP_FILE.gz"

    # Get file size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

    echo -e "${GREEN}✓ Backup completed successfully${NC}"
    echo "  File: $BACKUP_FILE"
    echo "  Size: $SIZE"
    echo "  Timestamp: $TIMESTAMP"

    # Keep only last 7 backups
    echo -e "${YELLOW}Cleaning up old backups (keeping last 7)...${NC}"
    ls -t "$BACKUP_DIR"/hospital-backup_*.sql.gz | tail -n +8 | xargs -r rm

    echo -e "${GREEN}Backup management complete${NC}"
else
    echo -e "${RED}✗ Backup failed${NC}"
    rm -f "$BACKUP_FILE"
    exit 1
fi

echo ""
echo -e "${GREEN}Available backups:${NC}"
ls -lh "$BACKUP_DIR"/hospital-backup_*.sql.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'

echo ""
echo -e "${YELLOW}To restore a backup:${NC}"
echo "  gunzip < $BACKUP_FILE | docker-compose -f $COMPOSE_FILE exec -T postgres psql -U ${DB_USER:-hospital_admin} -d ${DB_NAME:-hospital-swiss-clean}"
echo ""
