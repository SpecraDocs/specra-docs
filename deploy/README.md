# Specra Docs - Deployment Guide

Complete guide for deploying Specra Docs to production using Docker and Caddy.

## 📁 Folder Structure

```
deploy/
├── README.md                    # This file - complete deployment guide
├── QUICK-START.md              # Quick reference for common commands
├── DEPLOYMENT-SUMMARY.md       # Architecture overview and summary
├── docker/                     # Docker configuration files
│   ├── Dockerfile              # Multi-stage Docker build
│   ├── docker-compose.yml      # Container orchestration
│   ├── .dockerignore          # Build exclusions
│   └── .env.production        # Environment variable template
├── caddy/                      # Web server configuration
│   └── Caddyfile              # Reverse proxy + HTTPS config
└── scripts/                    # Deployment automation scripts
    ├── setup.sh               # Initial server setup
    ├── deploy.sh              # Deploy updates
    ├── backup.sh              # Database backup
    ├── restore.sh             # Database restore
    ├── logs.sh                # Log viewer
    └── verify.sh              # Deployment verification
```

## 🏗️ Architecture

```
Internet → Caddy (Port 80/443) → Docker Container (Port 3000) → Next.js App → PostgreSQL
```

- **Caddy**: Reverse proxy, automatic HTTPS, handles SSL certificates
- **Docker**: Containerizes the Next.js application
- **PostgreSQL**: Database (runs in Docker)
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

### 1.2 Run Initial Setup Script

```bash
# Clone repository first (or download setup script)
git clone https://github.com/SpecraDocs/specra-docs.git /var/www/specra-docs
cd /var/www/specra-docs

# Run setup script (installs Docker, Caddy, etc.)
chmod +x deploy/scripts/setup.sh
./deploy/scripts/setup.sh
```

This installs:
- Docker & Docker Compose
- Caddy web server
- Git
- UFW firewall
- Fail2Ban
- Creates necessary directories

### 1.3 Log out and back in

```bash
exit
ssh your-user@your-server-ip
```

This applies Docker group permissions.

---

## Part 2: Configuration

### 2.1 Configure Environment Variables

```bash
cd /var/www/specra-docs

# Copy environment template
cp deploy/docker/.env.production .env

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

### 2.2 Configure Caddy

```bash
# Copy Caddyfile
sudo cp deploy/caddy/Caddyfile /etc/caddy/Caddyfile

# Edit and replace domain
sudo nano /etc/caddy/Caddyfile
# Change "specra-docs.com" to your actual domain
```

### 2.3 Copy Docker Files to Root

```bash
# Copy Docker files to project root
cp deploy/docker/Dockerfile .
cp deploy/docker/docker-compose.yml .
cp deploy/docker/.dockerignore .
```

---

## Part 3: Deploy Application

### 3.1 Build and Start Services

```bash
cd /var/www/specra-docs
docker-compose up -d --build
```

This will:
- Build the Next.js application
- Start PostgreSQL database
- Start the application container

### 3.2 Run Database Migrations

```bash
docker-compose exec app npx prisma migrate deploy
```

### 3.3 Seed Admin User

```bash
docker-compose exec app npm run seed-admin
```

### 3.4 Start Caddy

```bash
sudo systemctl enable caddy
sudo systemctl start caddy
```

### 3.5 Verify Deployment

```bash
# Check containers
docker-compose ps

# Check application
curl http://localhost:3000

# Run verification script
chmod +x deploy/scripts/verify.sh
./deploy/scripts/verify.sh
```

Visit your domain: `https://your-domain.com` 🎉

---

## Part 4: Maintenance & Updates

### Deploy Updates

```bash
cd /var/www/specra-docs
chmod +x deploy/scripts/deploy.sh
./deploy/scripts/deploy.sh
```

This script automatically:
- Pulls latest code
- Rebuilds containers
- Runs migrations
- Restarts services
- Verifies health

### Backup Database

```bash
chmod +x deploy/scripts/backup.sh
./deploy/scripts/backup.sh
```

Backups are stored in `/var/backups/specra-docs/`

### View Logs

```bash
chmod +x deploy/scripts/logs.sh

# View app logs
./deploy/scripts/logs.sh app

# Follow logs live
./deploy/scripts/logs.sh app -f

# View last 50 lines
./deploy/scripts/logs.sh app -n 50
```

### Restore Database

```bash
chmod +x deploy/scripts/restore.sh
./deploy/scripts/restore.sh /path/to/backup.sql.gz
```

---

## Part 5: Automated Tasks

### Daily Backups

```bash
# Add to crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * cd /var/www/specra-docs && /var/www/specra-docs/deploy/scripts/backup.sh
```

### Health Monitoring

```bash
# Create health check script
sudo nano /usr/local/bin/specra-health-check.sh
```

Add:
```bash
#!/bin/bash
if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
    cd /var/www/specra-docs && docker-compose restart app
    echo "$(date): App restarted" >> /var/log/specra-health.log
fi
```

```bash
# Make executable and schedule (every 5 minutes)
sudo chmod +x /usr/local/bin/specra-health-check.sh
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/specra-health-check.sh") | crontab -
```

---

## Quick Reference

```bash
# Deploy updates
./deploy/scripts/deploy.sh

# View logs
./deploy/scripts/logs.sh app -f

# Backup database
./deploy/scripts/backup.sh

# Restart services
docker-compose restart

# Check status
docker-compose ps

# Verify deployment
./deploy/scripts/verify.sh
```

---

## Troubleshooting

### Application Won't Start
```bash
# Check logs
docker-compose logs app

# Restart
docker-compose restart app
```

### Database Issues
```bash
# Check database
docker-compose logs db

# Access database shell
docker-compose exec db psql -U specra specra
```

### SSL/HTTPS Issues
```bash
# Check Caddy
sudo systemctl status caddy

# Restart Caddy
sudo systemctl restart caddy

# View Caddy logs
sudo journalctl -u caddy -f
```

---

## Support

- GitHub Issues: https://github.com/SpecraDocs/specra-docs/issues
- Documentation: See [QUICK-START.md](./QUICK-START.md) for quick reference
- Architecture: See [DEPLOYMENT-SUMMARY.md](./DEPLOYMENT-SUMMARY.md) for details

---

**Last Updated:** February 2026
