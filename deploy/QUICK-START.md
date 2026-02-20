# Specra Docs - Quick Start Guide (Docker Alternative)

> **Note:** The actual production deployment uses **Bun + systemd + Caddy**. See `../deploy.md` and `../deploy.sh` for the production deployment. This guide covers the Docker-based alternative.

Fast deployment guide for experienced users. For detailed instructions, see [README.md](./README.md).

## 🚀 First Time Setup (New Server)

```bash
# 1. Run initial setup (installs Docker, Caddy, etc.)
curl -o setup.sh https://raw.githubusercontent.com/dalmasonto/specra-docs/main/deploy/setup.sh
chmod +x setup.sh
./setup.sh

# 2. Log out and back in for Docker group changes
exit
ssh your-user@your-server

# 3. Clone repository
cd /var/www/specra-docs
git clone https://github.com/dalmasonto/specra-docs.git .

# 4. Configure environment
cp deploy/.env.production .env
nano .env  # Update with your values

# 5. Update domain in Caddyfile
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile  # Replace specra-docs.com

# 6. Copy docker files to root
cp deploy/docker-compose.yml .
cp deploy/Dockerfile .
cp deploy/.dockerignore .

# 7. Build and start
docker-compose up -d --build

# 8. Run migrations
docker-compose exec app npx prisma migrate deploy

# 9. Seed admin user
docker-compose exec app npm run seed-admin

# 10. Start Caddy
sudo systemctl enable caddy
sudo systemctl start caddy

# Done! Visit https://yourdomain.com
```

## 📦 Deployment Scripts

All scripts are in the `deploy/` folder:

| Script | Purpose | Usage |
|--------|---------|-------|
| `setup.sh` | Initial server setup | `./deploy/setup.sh` |
| `deploy.sh` | Deploy updates | `./deploy/deploy.sh` |
| `backup.sh` | Backup database | `./deploy/backup.sh` |
| `restore.sh` | Restore database | `./deploy/restore.sh backup.sql.gz` |
| `logs.sh` | View logs | `./deploy/logs.sh app -f` |

## 🔄 Common Commands

### Deployment & Updates
```bash
# Quick deploy (pulls code, rebuilds, migrates)
cd /var/www/specra-docs && ./deploy/deploy.sh

# Manual deploy steps
git pull origin main
docker-compose up -d --build
docker-compose exec app npx prisma migrate deploy
sudo systemctl reload caddy
```

### Container Management
```bash
# View running containers
docker-compose ps

# View logs (live)
docker-compose logs -f app

# View logs (last 100 lines)
docker-compose logs --tail=100 app

# Restart app only
docker-compose restart app

# Restart all services
docker-compose restart

# Stop all services
docker-compose down

# Start all services
docker-compose up -d
```

### Database Operations
```bash
# Create backup
./deploy/backup.sh

# Restore from backup
./deploy/restore.sh /var/backups/specra-docs/specra_20260209_120000.sql.gz

# Access database shell
docker-compose exec db psql -U specra specra

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Reset database (⚠️ DESTRUCTIVE)
docker-compose exec app npx prisma migrate reset
```

### Monitoring
```bash
# View app logs (live)
./deploy/logs.sh app -f

# View database logs
./deploy/logs.sh db -f

# View Caddy logs
./deploy/logs.sh caddy -f

# Check container health
docker-compose ps

# Check resource usage
docker stats

# System resources
htop
```

### Caddy Management
```bash
# Reload Caddy (after config changes)
sudo systemctl reload caddy

# Restart Caddy
sudo systemctl restart caddy

# Check Caddy status
sudo systemctl status caddy

# View Caddy logs
sudo journalctl -u caddy -f

# Validate Caddyfile
caddy validate --config /etc/caddy/Caddyfile
```

### Admin User
```bash
# Seed/update admin user
docker-compose exec app npm run seed-admin

# Check user role in database
docker-compose exec db psql -U specra specra -c "SELECT email, role FROM \"User\" WHERE email='admin@yourdomain.com';"
```

## 🐛 Troubleshooting

### App won't start
```bash
# Check logs
docker-compose logs app

# Common fixes:
docker-compose restart app  # Restart
docker-compose down && docker-compose up -d  # Full restart
```

### Database connection errors
```bash
# Check database is running
docker-compose ps db

# Restart database
docker-compose restart db

# Check connection
docker-compose exec db psql -U specra -d specra -c "SELECT 1;"
```

### Caddy not serving site
```bash
# Check status
sudo systemctl status caddy

# Validate config
caddy validate --config /etc/caddy/Caddyfile

# Restart
sudo systemctl restart caddy

# Check logs
sudo journalctl -u caddy -n 50
```

### SSL certificate issues
```bash
# Restart Caddy (auto-renews)
sudo systemctl restart caddy

# Check certificate expiry
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

## 📋 Pre-Deployment Checklist

- [ ] Domain DNS A record points to server IP
- [ ] `.env` file configured with all required values
- [ ] `AUTH_SECRET` generated (not using default)
- [ ] GitHub OAuth app created and credentials added
- [ ] Stripe/M-Pesa credentials configured (if using payments)
- [ ] Database credentials set in `.env`
- [ ] `Caddyfile` updated with correct domain
- [ ] Firewall configured (ports 22, 80, 443 open)
- [ ] Admin email and password set in `.env`

## 🔒 Security Checklist

- [ ] SSH key authentication enabled
- [ ] Root login disabled
- [ ] Firewall (ufw) enabled
- [ ] Fail2Ban installed and running
- [ ] Strong database password set
- [ ] Strong admin password set
- [ ] HTTPS working (Caddy auto-manages)
- [ ] Security headers configured (in Caddyfile)
- [ ] Regular backups scheduled

## 📊 Monitoring Setup

### Automatic Backups (Daily at 2 AM)
```bash
# Add to crontab
crontab -e

# Add this line:
0 2 * * * cd /var/www/specra-docs && /var/www/specra-docs/deploy/backup.sh
```

### Health Check (Every 5 minutes)
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
# Make executable and schedule
sudo chmod +x /usr/local/bin/specra-health-check.sh
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/specra-health-check.sh") | crontab -
```

## 🆘 Emergency Commands

```bash
# Complete reset (⚠️ DESTRUCTIVE - loses all data)
docker-compose down -v
docker-compose up -d --build
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npm run seed-admin

# View all container logs
docker-compose logs --tail=500

# Force rebuild everything
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 📞 Support

- GitHub Issues: https://github.com/dalmasonto/specra-docs/issues
- Documentation: See [README.md](./README.md) for detailed guide

---

**Quick Deploy:** `cd /var/www/specra-docs && ./deploy/deploy.sh`
