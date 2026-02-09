#!/bin/bash
# Verification script for Specra Docs deployment
# Checks if all components are properly configured and running

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║  Specra Docs - Deployment Verification  ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Function to check status
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

# Check if we're in the project directory
echo -e "${BLUE}📁 Checking project directory...${NC}"
if [ -f "package.json" ]; then
    check_pass "In project directory"
else
    check_fail "Not in project directory (package.json not found)"
    exit 1
fi

# Check required files
echo ""
echo -e "${BLUE}📄 Checking required files...${NC}"

if [ -f ".env" ]; then
    check_pass ".env file exists"
else
    check_fail ".env file missing"
fi

if [ -f "docker-compose.yml" ]; then
    check_pass "docker-compose.yml exists"
else
    check_fail "docker-compose.yml missing"
fi

if [ -f "Dockerfile" ]; then
    check_pass "Dockerfile exists"
else
    check_fail "Dockerfile missing"
fi

# Check Docker installation
echo ""
echo -e "${BLUE}🐳 Checking Docker...${NC}"

if command -v docker &> /dev/null; then
    check_pass "Docker is installed"
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    echo -e "   Version: $DOCKER_VERSION"
else
    check_fail "Docker is not installed"
fi

if command -v docker-compose &> /dev/null; then
    check_pass "Docker Compose is installed"
    COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)
    echo -e "   Version: $COMPOSE_VERSION"
else
    check_fail "Docker Compose is not installed"
fi

# Check if Docker daemon is running
if docker ps &> /dev/null; then
    check_pass "Docker daemon is running"
else
    check_fail "Docker daemon is not running"
fi

# Check Caddy installation
echo ""
echo -e "${BLUE}🌐 Checking Caddy...${NC}"

if command -v caddy &> /dev/null; then
    check_pass "Caddy is installed"
    CADDY_VERSION=$(caddy version | cut -d' ' -f1)
    echo -e "   Version: $CADDY_VERSION"
else
    check_warn "Caddy is not installed (required for HTTPS)"
fi

if [ -f "/etc/caddy/Caddyfile" ]; then
    check_pass "Caddyfile exists"

    # Check if domain is configured
    if grep -q "specra-docs.com" /etc/caddy/Caddyfile 2>/dev/null; then
        check_warn "Caddyfile still has default domain (specra-docs.com)"
    else
        check_pass "Caddyfile domain configured"
    fi
else
    check_warn "Caddyfile not found at /etc/caddy/Caddyfile"
fi

if systemctl is-active --quiet caddy 2>/dev/null; then
    check_pass "Caddy service is running"
else
    check_warn "Caddy service is not running"
fi

# Check running containers
echo ""
echo -e "${BLUE}📦 Checking Docker containers...${NC}"

if [ -f "docker-compose.yml" ]; then
    APP_RUNNING=$(docker-compose ps -q app 2>/dev/null)
    DB_RUNNING=$(docker-compose ps -q db 2>/dev/null)

    if [ -n "$APP_RUNNING" ]; then
        if docker-compose ps app | grep -q "Up"; then
            check_pass "App container is running"
        else
            check_fail "App container exists but is not running"
        fi
    else
        check_warn "App container not found (run: docker-compose up -d)"
    fi

    if [ -n "$DB_RUNNING" ]; then
        if docker-compose ps db | grep -q "Up"; then
            check_pass "Database container is running"
        else
            check_fail "Database container exists but is not running"
        fi
    else
        check_warn "Database container not found (run: docker-compose up -d)"
    fi
fi

# Check environment variables
echo ""
echo -e "${BLUE}🔐 Checking environment variables...${NC}"

if [ -f ".env" ]; then
    # Check critical variables
    if grep -q "DATABASE_URL=" .env; then
        check_pass "DATABASE_URL is set"
    else
        check_fail "DATABASE_URL not found in .env"
    fi

    if grep -q "AUTH_SECRET=" .env; then
        check_pass "AUTH_SECRET is set"
    else
        check_fail "AUTH_SECRET not found in .env"
    fi

    if grep -q "NEXT_PUBLIC_APP_URL=" .env; then
        check_pass "NEXT_PUBLIC_APP_URL is set"
    else
        check_fail "NEXT_PUBLIC_APP_URL not found in .env"
    fi

    if grep -q "ADMIN_EMAIL=" .env; then
        check_pass "ADMIN_EMAIL is set"
    else
        check_fail "ADMIN_EMAIL not found in .env"
    fi
fi

# Check network connectivity
echo ""
echo -e "${BLUE}🌍 Checking connectivity...${NC}"

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    check_pass "Application responds on localhost:3000"
else
    check_warn "Application not responding on localhost:3000"
fi

# Check firewall
echo ""
echo -e "${BLUE}🔥 Checking firewall...${NC}"

if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        check_pass "UFW firewall is active"

        if ufw status | grep -q "80.*ALLOW"; then
            check_pass "Port 80 (HTTP) is open"
        else
            check_warn "Port 80 (HTTP) is not open"
        fi

        if ufw status | grep -q "443.*ALLOW"; then
            check_pass "Port 443 (HTTPS) is open"
        else
            check_warn "Port 443 (HTTPS) is not open"
        fi
    else
        check_warn "UFW firewall is not active"
    fi
fi

# Check disk space
echo ""
echo -e "${BLUE}💾 Checking disk space...${NC}"

DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    check_pass "Disk usage is ${DISK_USAGE}% (healthy)"
else
    check_warn "Disk usage is ${DISK_USAGE}% (consider cleanup)"
fi

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Deployment is ready.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  ${WARNINGS} warning(s) found. Review above.${NC}"
    exit 0
else
    echo -e "${RED}❌ ${ERRORS} error(s) and ${WARNINGS} warning(s) found.${NC}"
    echo -e "${YELLOW}Please fix errors before deploying to production.${NC}"
    exit 1
fi
