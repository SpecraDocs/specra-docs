#!/bin/bash
# Initial setup script for Specra Docs on a fresh server
# This script should be run once on a new server

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║   Specra Docs - Initial Setup Script    ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}⚠️  Please don't run this script as root. Run as a regular user with sudo access.${NC}"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install Docker
if ! command_exists docker; then
    echo -e "${YELLOW}🐳 Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

# Install Docker Compose
if ! command_exists docker-compose; then
    echo -e "${YELLOW}📦 Installing Docker Compose...${NC}"
    sudo apt install docker-compose -y
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✅ Docker Compose already installed${NC}"
fi

# Install Caddy
if ! command_exists caddy; then
    echo -e "${YELLOW}🌐 Installing Caddy...${NC}"
    sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
    sudo apt update
    sudo apt install caddy -y
    echo -e "${GREEN}✅ Caddy installed${NC}"
else
    echo -e "${GREEN}✅ Caddy already installed${NC}"
fi

# Install Git
if ! command_exists git; then
    echo -e "${YELLOW}📚 Installing Git...${NC}"
    sudo apt install git -y
    echo -e "${GREEN}✅ Git installed${NC}"
else
    echo -e "${GREEN}✅ Git already installed${NC}"
fi

# Install other useful tools
echo -e "${YELLOW}🔧 Installing additional tools...${NC}"
sudo apt install -y curl wget htop unzip ufw fail2ban

# Configure firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
sudo ufw --force enable
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
echo -e "${GREEN}✅ Firewall configured${NC}"

# Enable fail2ban
echo -e "${YELLOW}🛡️  Enabling Fail2Ban...${NC}"
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
echo -e "${GREEN}✅ Fail2Ban enabled${NC}"

# Create application directory
echo -e "${YELLOW}📁 Creating application directory...${NC}"
sudo mkdir -p /var/www/specra-docs
sudo chown -R $USER:$USER /var/www/specra-docs
echo -e "${GREEN}✅ Application directory created${NC}"

# Create sites directory for deployed docs
echo -e "${YELLOW}📁 Creating sites directory...${NC}"
sudo mkdir -p /var/www/sites
sudo chown -R $USER:$USER /var/www/sites
echo -e "${GREEN}✅ Sites directory created${NC}"

# Create backup directory
echo -e "${YELLOW}📁 Creating backup directory...${NC}"
sudo mkdir -p /var/backups/specra-docs
sudo chown -R $USER:$USER /var/backups/specra-docs
echo -e "${GREEN}✅ Backup directory created${NC}"

# Create log directory
echo -e "${YELLOW}📁 Creating log directory for Caddy...${NC}"
sudo mkdir -p /var/log/caddy
sudo chown -R caddy:caddy /var/log/caddy
echo -e "${GREEN}✅ Log directory created${NC}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Initial Setup Complete! 🎉          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Log out and log back in for Docker group changes to take effect"
echo "2. Clone your repository to /var/www/specra-docs"
echo "3. Copy and configure your .env file"
echo "4. Update the Caddyfile with your domain"
echo "5. Run: cd /var/www/specra-docs && docker-compose up -d"
echo ""
echo -e "${YELLOW}Need to log out now? Run: ${GREEN}exit${NC}"
