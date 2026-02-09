# Specra Docs Deployment Guide

Complete guide for deploying Specra Docs to a production server using Docker and Caddy.

## Architecture Overview

```
Internet → Caddy (Port 80/443) → Docker Container (Port 3000) → Next.js App → PostgreSQL
```

- **Caddy**: Reverse proxy, automatic HTTPS, handles SSL certificates
- **Docker**: Containerizes the Next.js application
- **PostgreSQL**: Database (can run in Docker or separately)
- **Next.js**: Application server running on port 3000

---

## Prerequisites

### On Your Local Machine
- Git access to the repository
- SSH access to the production server

### On Production Server
- Ubuntu 20.04+ or similar Linux distribution
- Root or sudo access
- Domain name pointing to server IP (A record configured)
- Minimum 2GB RAM, 2 CPU cores, 20GB storage

---

## Part 1: Initial Server Setup

### 1.1 Connect to Your Server

```bash
ssh root@your-server-ip
# or
ssh your-user@your-server-ip
```

### 1.2 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Install Required Software

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y

# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy -y

# Install Git (if not already installed)
sudo apt install git -y

# Verify installations
docker --version
docker-compose --version
caddy version
git --version
```

### 1.4 Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 1.5 Log out and back in for Docker group changes

```bash
exit
# SSH back in
ssh your-user@your-server-ip
```

---

## Part 2: Application Setup

### 2.1 Create Application Directory

```bash
sudo mkdir -p /var/www/specra-docs
sudo chown -R $USER:$USER /var/www/specra-docs
cd /var/www/specra-docs
```

### 2.2 Clone Repository

```bash
git clone https://github.com/dalmasonto/specra-docs.git .
# Or if using SSH
git clone git@github.com:dalmasonto/specra-docs.git .
```

### 2.3 Copy Deployment Files

```bash
# Copy docker-compose and related files from deploy folder
cp deploy/docker-compose.yml .
cp deploy/Dockerfile .
cp deploy/.dockerignore .
cp deploy/Caddyfile /etc/caddy/Caddyfile
```

### 2.4 Configure Environment Variables

```bash
# Copy environment template
cp deploy/.env.production .env

# Edit with your actual values
nano .env
```

**Important:** Update these values in `.env`:
- `DATABASE_URL` - Your PostgreSQL connection string
- `NEXT_PUBLIC_APP_URL` - Your domain (e.g., https://specra-docs.com)
- `AUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` - From GitHub OAuth app
- `STRIPE_SECRET_KEY` and related Stripe keys
- `MPESA_*` variables for M-Pesa integration
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` for admin user

### 2.5 Update Caddyfile

```bash
sudo nano /etc/caddy/Caddyfile
```

Replace `specra-docs.com` with your actual domain name.

---

## Part 3: Database Setup

### Option A: PostgreSQL in Docker (Recommended for Simple Setup)

The provided `docker-compose.yml` includes PostgreSQL. It will start automatically.

### Option B: External PostgreSQL Server

If using an external PostgreSQL server:

1. Create database:
```sql
CREATE DATABASE specra;
CREATE USER specra_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE specra TO specra_user;
```

2. Update `DATABASE_URL` in `.env` to point to external server

---

## Part 4: Build and Deploy

### 4.1 Build Docker Images

```bash
cd /var/www/specra-docs
docker-compose build
```

This will:
- Install dependencies
- Build Next.js application
- Create optimized production image

### 4.2 Start Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database (if using Docker)
- Next.js application

### 4.3 Run Database Migrations

```bash
docker-compose exec app npx prisma migrate deploy
```

### 4.4 Seed Admin User

```bash
docker-compose exec app npm run seed-admin
```

### 4.5 Verify Application

```bash
# Check if containers are running
docker-compose ps

# Check application logs
docker-compose logs -f app

# Test local connection
curl http://localhost:3000
```

### 4.6 Start Caddy

```bash
sudo systemctl enable caddy
sudo systemctl start caddy
sudo systemctl status caddy
```

### 4.7 Test Your Domain

Visit your domain in a browser:
- `https://your-domain.com` - Should show the homepage
- `https://your-domain.com/auth/login` - Login page
- HTTPS should work automatically (Caddy handles SSL)

---

## Part 5: Maintenance & Updates

### Viewing Logs

```bash
# Application logs
docker-compose logs -f app

# Database logs
docker-compose logs -f db

# Caddy logs
sudo journalctl -u caddy -f
```

### Updating the Application

```bash
cd /var/www/specra-docs

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d

# Run migrations if needed
docker-compose exec app npx prisma migrate deploy

# Reload Caddy (if Caddyfile changed)
sudo systemctl reload caddy
```

### Database Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-specra-db.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/specra-docs"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker-compose exec -T db pg_dump -U specra specra | gzip > $BACKUP_DIR/specra_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "specra_*.sql.gz" -mtime +7 -delete
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-specra-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-specra-db.sh
```

### Restarting Services

```bash
# Restart application only
docker-compose restart app

# Restart all services
docker-compose restart

# Restart Caddy
sudo systemctl restart caddy
```

### Checking Resource Usage

```bash
# Docker stats
docker stats

# System resources
htop
# or
top
```

---

## Part 6: Monitoring & Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
docker-compose logs app

# Common causes:
# - Database not ready (wait 30s and retry)
# - Missing environment variables
# - Port 3000 already in use
```

#### Database Connection Errors
```bash
# Check if database is running
docker-compose ps db

# Test connection
docker-compose exec db psql -U specra -d specra -c "SELECT 1;"
```

#### Caddy Not Serving Site
```bash
# Check Caddy status
sudo systemctl status caddy

# Validate Caddyfile
caddy validate --config /etc/caddy/Caddyfile

# Check logs
sudo journalctl -u caddy -n 50
```

#### SSL Certificate Issues
```bash
# Caddy auto-renews, but if issues occur:
sudo systemctl restart caddy

# Check certificate
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Health Checks

Create a simple health check script:

```bash
nano /usr/local/bin/health-check.sh
```

```bash
#!/bin/bash
# Check if app responds
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ App is healthy"
else
    echo "❌ App is down - restarting..."
    cd /var/www/specra-docs && docker-compose restart app
fi
```

```bash
chmod +x /usr/local/bin/health-check.sh
# Run every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/health-check.sh") | crontab -
```

---

## Part 7: Security Hardening

### 7.1 Secure SSH

```bash
sudo nano /etc/ssh/sshd_config
```

Set:
```
PermitRootLogin no
PasswordAuthentication no  # If using SSH keys
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### 7.2 Enable Automatic Security Updates

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 7.3 Configure Fail2Ban

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## Part 8: Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/specra` |
| `AUTH_SECRET` | Auth.js encryption key | Generate with `openssl rand -base64 32` |
| `AUTH_GITHUB_ID` | GitHub OAuth App ID | `Ov23liAC0eiREXzAcHK2` |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Secret | From GitHub settings |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_live_...` or `sk_test_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | `pk_live_...` or `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `MPESA_CONSUMER_KEY` | M-Pesa API consumer key | From Safaricom Daraja |
| `MPESA_CONSUMER_SECRET` | M-Pesa API consumer secret | From Safaricom Daraja |
| `MPESA_SHORTCODE` | M-Pesa business shortcode | Your till/paybill number |
| `MPESA_PASSKEY` | M-Pesa Lipa Na M-Pesa passkey | From Safaricom Daraja |
| `MPESA_CALLBACK_URL` | M-Pesa callback URL | `https://yourdomain.com/api/mpesa/callback` |
| `MPESA_ENV` | M-Pesa environment | `sandbox` or `production` |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL | `https://specra-docs.com` |
| `ADMIN_EMAIL` | Admin user email | `admin@yourdomain.com` |
| `ADMIN_PASSWORD` | Admin user password | Strong password |

---

## Quick Reference Commands

```bash
# View all containers
docker-compose ps

# View logs
docker-compose logs -f

# Restart app
docker-compose restart app

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Access database
docker-compose exec db psql -U specra specra

# Execute command in app container
docker-compose exec app npm run seed-admin

# Stop all services
docker-compose down

# Start all services
docker-compose up -d

# Rebuild after code changes
docker-compose up -d --build

# Check Caddy status
sudo systemctl status caddy
```

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/dalmasonto/specra-docs/issues
- Documentation: https://specra-docs.com

---

**Last Updated:** February 2026
