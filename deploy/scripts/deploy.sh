#!/bin/bash
# Deployment script for Specra Docs
# Run this script to deploy updates to production

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi

# Pull latest code
echo -e "${YELLOW}📥 Pulling latest code from Git...${NC}"
git pull origin main

# Stop containers
echo -e "${YELLOW}🛑 Stopping containers...${NC}"
docker-compose down

# Rebuild images
echo -e "${YELLOW}🔨 Building Docker images...${NC}"
docker-compose build --no-cache

# Start containers
echo -e "${YELLOW}▶️  Starting containers...${NC}"
docker-compose up -d

# Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
sleep 10

# Run database migrations
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
docker-compose exec -T app npx prisma migrate deploy

# Generate Prisma client (just in case)
echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
docker-compose exec -T app npx prisma generate

# Seed admin user
echo -e "${YELLOW}👤 Seeding admin user...${NC}"
docker-compose exec -T app npm run seed-admin

# Reload Caddy
echo -e "${YELLOW}🔄 Reloading Caddy...${NC}"
sudo systemctl reload caddy

# Health check
echo -e "${YELLOW}🏥 Running health check...${NC}"
sleep 5

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Deployment successful! Application is running.${NC}"

    # Show container status
    echo ""
    echo -e "${GREEN}Container Status:${NC}"
    docker-compose ps

    echo ""
    echo -e "${GREEN}Recent logs:${NC}"
    docker-compose logs --tail=20 app
else
    echo -e "${RED}❌ Health check failed! Application may not be running correctly.${NC}"
    echo -e "${RED}Check logs with: docker-compose logs app${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo -e "${GREEN}Visit your site: ${PUBLIC_APP_URL:-https://yourdomain.com}${NC}"
