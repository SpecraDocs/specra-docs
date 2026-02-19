#!/bin/bash
# Sets up cron jobs for Specra Docs periodic tasks
# Run once on the server after deployment

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Load CRON_SECRET from .env.production if not already set
if [ -z "$CRON_SECRET" ]; then
    ENV_FILE="$(dirname "$0")/../docker/.env.production"
    if [ -f "$ENV_FILE" ]; then
        CRON_SECRET=$(grep '^CRON_SECRET=' "$ENV_FILE" | cut -d'=' -f2-)
    fi
fi

if [ -z "$CRON_SECRET" ]; then
    echo -e "${RED}Error: CRON_SECRET not set. Export it or add to .env.production${NC}"
    exit 1
fi

APP_URL="${APP_URL:-http://localhost:3000}"

echo -e "${YELLOW}Setting up cron jobs for Specra Docs...${NC}"

# Build crontab entries
REMINDERS_JOB="0 9 * * * curl -sf -H 'Authorization: Bearer ${CRON_SECRET}' ${APP_URL}/api/cron/subscription-reminders > /dev/null 2>&1 # specra-subscription-reminders"
ENFORCE_JOB="0 * * * * curl -sf -H 'Authorization: Bearer ${CRON_SECRET}' ${APP_URL}/api/cron/enforce-subscriptions > /dev/null 2>&1 # specra-enforce-subscriptions"

# Remove any existing Specra cron entries, then append new ones
(crontab -l 2>/dev/null | grep -v '# specra-' || true; echo "$REMINDERS_JOB"; echo "$ENFORCE_JOB") | crontab -

echo -e "${GREEN}Cron jobs installed:${NC}"
echo "  - Subscription reminders: daily at 9:00 AM"
echo "  - Enforce subscriptions:  every hour"
echo ""
echo -e "${YELLOW}Verify with: crontab -l${NC}"
