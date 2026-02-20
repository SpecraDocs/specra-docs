# Deployment Files Summary (Docker Alternative)

> **Note:** The actual production deployment uses **Bun + systemd + Caddy** (no Docker for the main app). See `../deploy.md` for the production deployment guide. This folder contains a Docker-based alternative.

This folder contains files and scripts for deploying Specra Docs using Docker and Caddy.

## 📁 Files Overview

### Documentation
- **README.md** - Complete deployment guide with step-by-step instructions
- **QUICK-START.md** - Quick reference for common commands and operations
- **DEPLOYMENT-SUMMARY.md** - This file, overview of deployment setup

### Docker Configuration
- **Dockerfile** - Multi-stage Docker build for SvelteKit application
- **docker-compose.yml** - Orchestrates app + PostgreSQL containers
- **.dockerignore** - Excludes unnecessary files from Docker build

### Web Server
- **Caddyfile** - Caddy reverse proxy configuration with automatic HTTPS

### Environment
- **.env.production** - Template for production environment variables

### Scripts
- **setup.sh** - Initial server setup (Docker, Caddy, firewall, etc.)
- **deploy.sh** - Deploy updates (pull, build, migrate, restart)
- **backup.sh** - Backup PostgreSQL database
- **restore.sh** - Restore database from backup
- **logs.sh** - View logs from different services

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │    Caddy    │  (Port 80/443)
                  │ (Reverse    │  - Automatic HTTPS
                  │  Proxy)     │  - SSL Certificates
                  └──────┬──────┘  - Security Headers
                         │
                         ▼
              ┌──────────────────────┐
              │  Docker Container    │
              │   (SvelteKit App)      │  (Port 3000)
              │                      │
              │  - Built with Prisma │
              │  - Node.js Runtime   │
              │  - Standalone Output │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Docker Container    │
              │   (PostgreSQL)       │  (Port 5432)
              │                      │
              │  - Persistent Volume │
              │  - Health Checks     │
              └──────────────────────┘
```

## 🚀 Deployment Flow

### First Time Deployment
1. **Server Setup** (`setup.sh`)
   - Install Docker, Caddy, system tools
   - Configure firewall
   - Create directories

2. **Application Setup**
   - Clone repository
   - Configure `.env` file
   - Update `Caddyfile` with domain

3. **Build & Deploy**
   - Build Docker images
   - Start containers
   - Run database migrations
   - Seed admin user
   - Start Caddy

### Subsequent Deployments
1. **Update** (`deploy.sh`)
   - Pull latest code
   - Rebuild containers
   - Run migrations
   - Restart services

## 🔧 Key Features

### Docker Setup
- **Multi-stage build** - Optimized image size
- **Standalone output** - No external SvelteKit server needed
- **Health checks** - Automatic container health monitoring
- **Non-root user** - Security best practice
- **Persistent volumes** - Database data survives restarts

### Database
- **PostgreSQL 16** - Latest stable version
- **Automatic backups** - Scheduled daily backups
- **Health checks** - Ensures DB is ready before app starts
- **Volume persistence** - Data stored in Docker volume

### Web Server (Caddy)
- **Automatic HTTPS** - Let's Encrypt SSL certificates
- **Auto-renewal** - Certificates renewed automatically
- **Security headers** - HSTS, XSS protection, etc.
- **Gzip compression** - Faster page loads
- **Health checks** - Monitors application status

## 📊 Resource Requirements

### Minimum
- **RAM:** 2GB
- **CPU:** 2 cores
- **Storage:** 20GB
- **OS:** Ubuntu 20.04+ or similar

### Recommended (Production)
- **RAM:** 4GB+
- **CPU:** 4 cores+
- **Storage:** 50GB+ SSD
- **OS:** Ubuntu 22.04 LTS

## 🔒 Security Features

1. **Application**
   - Non-root Docker user
   - Environment variable isolation
   - Secure session management (Auth.js)

2. **Database**
   - Internal Docker network
   - Password authentication
   - Bind to localhost only

3. **Web Server**
   - Automatic HTTPS
   - Security headers (HSTS, CSP, etc.)
   - Rate limiting (via Caddy)

4. **Server**
   - UFW firewall
   - Fail2Ban protection
   - SSH key authentication
   - Automatic security updates

## 📈 Monitoring & Maintenance

### Automated Tasks
- **Daily backups** - 2 AM, 7-day retention
- **Health checks** - Every 5 minutes
- **Log rotation** - Automatic via Docker
- **SSL renewal** - Automatic via Caddy

### Manual Tasks
- Check logs regularly
- Update application weekly
- Review backups monthly
- Update system packages monthly

## 🆘 Troubleshooting Guide

### Application Issues
```bash
# Check logs
./deploy/logs.sh app -f

# Restart app
docker-compose restart app

# Rebuild
docker-compose up -d --build
```

### Database Issues
```bash
# Check database logs
./deploy/logs.sh db

# Access database
docker-compose exec db psql -U specra specra

# Restore from backup
./deploy/restore.sh /path/to/backup.sql.gz
```

### SSL/Caddy Issues
```bash
# Check Caddy logs
./deploy/logs.sh caddy -f

# Validate config
caddy validate --config /etc/caddy/Caddyfile

# Restart Caddy
sudo systemctl restart caddy
```

## 📝 Environment Variables Required

| Category | Variables |
|----------|-----------|
| **Database** | `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` |
| **Auth** | `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` |
| **Stripe** | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **M-Pesa** | `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, etc. |
| **App** | `NEXT_PUBLIC_APP_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` |

See `.env.production` template for complete list.

## 🔄 Update Process

1. Code changes pushed to repository
2. SSH into server
3. Run `./deploy/deploy.sh`
4. Script automatically:
   - Pulls latest code
   - Rebuilds containers
   - Runs migrations
   - Restarts services
   - Verifies health

## 📚 Additional Resources

- **Full Guide:** [README.md](./README.md)
- **Quick Reference:** [QUICK-START.md](./QUICK-START.md)
- **Docker Docs:** https://docs.docker.com
- **Caddy Docs:** https://caddyserver.com/docs
- **SvelteKit Deploy:** https://nextjs.org/docs/deployment

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] Domain DNS configured
- [ ] Server meets minimum requirements
- [ ] SSH access configured
- [ ] All environment variables set
- [ ] GitHub OAuth app created
- [ ] Stripe/M-Pesa configured (if needed)
- [ ] Admin credentials set
- [ ] Backup strategy planned
- [ ] Monitoring setup completed

## 🎯 Production Best Practices

1. **Use strong passwords** - Generate secure random passwords
2. **Enable automatic backups** - Schedule daily database backups
3. **Monitor logs** - Regularly check application and server logs
4. **Keep updated** - Update dependencies and system packages
5. **Test restores** - Periodically test backup restoration
6. **Use health checks** - Ensure automated health monitoring
7. **Document changes** - Keep track of configuration changes
8. **Plan for scaling** - Monitor resources and plan upgrades

## 📞 Support & Contributing

- **Issues:** https://github.com/dalmasonto/specra-docs/issues
- **Discussions:** https://github.com/dalmasonto/specra-docs/discussions
- **Email:** admin@specra-docs.com

---

**Created:** February 2026
**Last Updated:** February 2026
**Maintainers:** dalmasonto, arthur-kamau
