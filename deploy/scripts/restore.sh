#!/bin/bash
# Database restore script for Specra Docs
# Restores PostgreSQL database from backup file

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: No backup file specified${NC}"
    echo "Usage: ./restore.sh <backup-file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lh /var/backups/specra-docs/*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This will REPLACE the current database!${NC}"
echo -e "${YELLOW}Backup file: $BACKUP_FILE${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled.${NC}"
    exit 0
fi

# Check if database container is running
if ! docker-compose ps db | grep -q "Up"; then
    echo -e "${RED}❌ Database container is not running!${NC}"
    exit 1
fi

echo -e "${YELLOW}🗄️  Starting database restore...${NC}"

# Drop existing connections
echo -e "${YELLOW}🔌 Closing existing database connections...${NC}"
docker-compose exec -T db psql -U specra postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'specra' AND pid <> pg_backend_pid();"

# Drop and recreate database
echo -e "${YELLOW}🗑️  Dropping existing database...${NC}"
docker-compose exec -T db psql -U specra postgres -c "DROP DATABASE IF EXISTS specra;"
docker-compose exec -T db psql -U specra postgres -c "CREATE DATABASE specra;"

# Restore from backup
echo -e "${YELLOW}📥 Restoring from backup...${NC}"
gunzip < "$BACKUP_FILE" | docker-compose exec -T db psql -U specra specra

echo -e "${GREEN}✅ Database restored successfully!${NC}"

# Restart application
echo -e "${YELLOW}🔄 Restarting application...${NC}"
docker-compose restart app

echo -e "${GREEN}🎉 Restore complete!${NC}"
