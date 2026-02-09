#!/bin/bash
# Database backup script for Specra Docs
# Backs up PostgreSQL database to timestamped file

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/specra-docs}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="specra_${DATE}.sql.gz"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🗄️  Starting database backup...${NC}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database container is running
if ! docker-compose ps db | grep -q "Up"; then
    echo -e "${RED}❌ Database container is not running!${NC}"
    exit 1
fi

# Create backup
echo -e "${YELLOW}📦 Creating backup: $BACKUP_FILE${NC}"
docker-compose exec -T db pg_dump -U specra specra | gzip > "$BACKUP_DIR/$BACKUP_FILE"

# Check if backup was created successfully
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE)${NC}"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
fi

# Clean up old backups
echo -e "${YELLOW}🧹 Cleaning up backups older than $RETENTION_DAYS days...${NC}"
find "$BACKUP_DIR" -name "specra_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# List recent backups
echo -e "${GREEN}📋 Recent backups:${NC}"
ls -lh "$BACKUP_DIR" | grep "specra_" | tail -5

echo -e "${GREEN}✅ Backup complete!${NC}"
