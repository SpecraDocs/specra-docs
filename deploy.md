# Specra-Docs Deployment Guide

specra-docs is a full SaaS app (API routes, database, auth, payments) built on SvelteKit with `@sveltejs/adapter-node`. It requires a running Node.js server with Caddy as a reverse proxy.

**Server**: `ssh root@46.101.48.218` (user: `kamau`)

**Important notes**:
- The server has limited RAM — `npm install` will get OOM-killed. All `node_modules` must be built locally and included in the deployment tarball.
- The server may run a different Node.js version than local. `npx prisma generate` must run on the server to produce a compatible Prisma client.
- Stripe and Resend SDKs initialize eagerly at build time — placeholder env vars must be provided during `npm run build`.

---

## Part A: New Server Setup (First Time Only)

### 1. Install Prerequisites

SSH into the server:
```bash
ssh root@46.101.48.218
```

**Install Node.js 22+**:
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # verify
```

**Install PostgreSQL 16**:
```bash
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

**Create the database and user**:
```bash
sudo -u postgres psql
```
```sql
CREATE USER specra WITH PASSWORD 'your-secure-password';
CREATE DATABASE specra OWNER specra;
GRANT ALL PRIVILEGES ON DATABASE specra TO specra;
\q
```

**Install PM2 and tsx globally**:
```bash
sudo npm install -g pm2 tsx
```

---

### 2. Build Locally

On your **local machine**:

```bash
cd /home/kamau/Development/Projects/specra/specra-docs

npm install
npx prisma generate

# Stripe and Resend initialize at build time — provide placeholder env vars
STRIPE_SECRET_KEY="sk_test_placeholder" RESEND_API_KEY="re_placeholder" npm run build
```

This produces `build/` via `@sveltejs/adapter-node`.

---

### 3. Install Production node_modules Locally

The server doesn't have enough RAM to run `npm install`. Build prod deps in a temp directory on your local machine:

```bash
mkdir -p /tmp/specra-prod-deps
cp package.json package-lock.json specra-0.2.9.tgz /tmp/specra-prod-deps/
cd /tmp/specra-prod-deps
npm install --omit=dev
cd /home/kamau/Development/Projects/specra/specra-docs
```

---

### 4. Package and Transfer

The tarball includes everything the server needs — no `npm install` required on the server.

```bash
cd /home/kamau/Development/Projects/specra/specra-docs

tar -czf specra-deploy.tar.gz \
  build/ \
  static/ \
  docs/ \
  prisma/ \
  prisma.config.ts \
  scripts/ \
  server.ts \
  specra.config.json \
  specra-0.2.9.tgz \
  src/lib/server/ \
  package.json \
  package-lock.json \
  --directory=/tmp/specra-prod-deps node_modules/

scp specra-deploy.tar.gz root@46.101.48.218:/home/kamau/specra/
```

**Note**: `src/lib/server/` is included because `server.ts` imports `websocket.ts` (which imports `chat.ts` and `db.ts`), and `scripts/seed-admin.ts` imports `db.ts`.

---

### 5. Extract on Server

```bash
ssh root@46.101.48.218

mkdir -p /home/kamau/specra
cd /home/kamau/specra
tar -xzf specra-deploy.tar.gz
rm specra-deploy.tar.gz
```

---

### 6. Create Environment File

Copy `.env.sample` from the repo and fill in the real values:

```bash
scp /home/kamau/Development/Projects/specra/specra-docs/.env.sample root@46.101.48.218:/home/kamau/specra/.env
ssh root@46.101.48.218 'nano /home/kamau/specra/.env'
```

See `.env.sample` for all required variables and their descriptions.

---

### 7. Run Prisma Generate, Migrations & Seed

Prisma client must be generated **on the server** because the server may run a different Node.js version than your local machine. The locally-built Prisma client may not be compatible.

```bash
cd /home/kamau/specra

# Regenerate Prisma client for the server's Node.js version
npx prisma generate

# Push schema to database
npx prisma db push

# Seed admin user and plans
npx tsx scripts/seed-admin.ts
```

---

### 8. Start the App with PM2

The app uses a custom `server.ts` entry point (for WebSocket support):

```bash
cd /home/kamau/specra

pm2 start "node --import tsx server.ts" \
  --name specra-docs \
  --cwd /home/kamau/specra

pm2 save
pm2 startup  # follow the printed command to enable on boot
```

The app runs on **port 3000**. Verify:
```bash
curl http://localhost:3000
```

---

### 9. Configure Caddy (Reverse Proxy)

Edit your Caddy config:
```bash
nano ~/caddy.json
```

Add the specra-docs.com route as a `reverse_proxy`:

```json
{
  "match": [
    {
      "host": ["specra-docs.com"]
    }
  ],
  "handle": [
    {
      "handler": "reverse_proxy",
      "upstreams": [
        {
          "dial": "localhost:3000"
        }
      ]
    }
  ]
}
```

Reload Caddy:
```bash
curl localhost:2019/load \
  -H "Content-Type: application/json" \
  -d @caddy.json
```

---

### 10. Set Up Stripe Webhook

In Stripe Dashboard:
1. Go to **Developers → Webhooks**
2. Add endpoint: `https://specra-docs.com/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy webhook signing secret → update `STRIPE_WEBHOOK_SECRET` in `~/specra/.env`
5. Restart: `pm2 restart specra-docs`

---

### 11. Set Up GitHub OAuth

1. Go to **GitHub → Settings → Developer Settings → OAuth Apps**
2. Set **Homepage URL**: `https://specra-docs.com`
3. Set **Authorization callback URL**: `https://specra-docs.com/api/auth/callback/github`
4. Update `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` in `~/specra/.env`
5. Restart: `pm2 restart specra-docs`

---

## Part B: Updating the VPS with a New Version

When you have code changes and want to redeploy:

### 1. Build locally

```bash
cd /home/kamau/Development/Projects/specra/specra-docs

npm install
npx prisma generate
STRIPE_SECRET_KEY="sk_test_placeholder" RESEND_API_KEY="re_placeholder" npm run build
```

### 2. Rebuild prod node_modules (only if dependencies changed)

```bash
rm -rf /tmp/specra-prod-deps
mkdir -p /tmp/specra-prod-deps
cp package.json package-lock.json specra-0.2.9.tgz /tmp/specra-prod-deps/
cd /tmp/specra-prod-deps
npm install --omit=dev
cd /home/kamau/Development/Projects/specra/specra-docs
```

If no dependencies changed, skip this step — reuse the existing `/tmp/specra-prod-deps/node_modules/`.

### 3. Package and upload

```bash
cd /home/kamau/Development/Projects/specra/specra-docs

tar -czf specra-deploy.tar.gz \
  build/ \
  static/ \
  docs/ \
  prisma/ \
  prisma.config.ts \
  scripts/ \
  server.ts \
  specra.config.json \
  specra-0.2.9.tgz \
  src/lib/server/ \
  package.json \
  package-lock.json \
  --directory=/tmp/specra-prod-deps node_modules/

scp specra-deploy.tar.gz root@46.101.48.218:/home/kamau/specra/
```

### 4. Deploy on server

```bash
ssh root@46.101.48.218

cd /home/kamau/specra
tar -xzf specra-deploy.tar.gz
rm specra-deploy.tar.gz

# Regenerate Prisma client for server's Node version
npx prisma generate

# Only if schema changed:
npx prisma db push

# Restart the app
pm2 restart specra-docs
```

### Quick One-Liner (after scp, no schema changes)

```bash
ssh root@46.101.48.218 'cd /home/kamau/specra && tar -xzf specra-deploy.tar.gz && rm specra-deploy.tar.gz && npx prisma generate && pm2 restart specra-docs'
```

### deploy.sh Script

Save this in the project root for quick redeployments:

```bash
#!/bin/bash
set -e

cd /home/kamau/Development/Projects/specra/specra-docs

echo "Building..."
npx prisma generate
STRIPE_SECRET_KEY="sk_test_placeholder" RESEND_API_KEY="re_placeholder" npm run build

echo "Building prod node_modules..."
rm -rf /tmp/specra-prod-deps
mkdir -p /tmp/specra-prod-deps
cp package.json package-lock.json specra-0.2.9.tgz /tmp/specra-prod-deps/
cd /tmp/specra-prod-deps && npm install --omit=dev
cd /home/kamau/Development/Projects/specra/specra-docs

echo "Packaging..."
tar -czf specra-deploy.tar.gz \
  build/ \
  static/ \
  docs/ \
  prisma/ \
  prisma.config.ts \
  scripts/ \
  server.ts \
  specra.config.json \
  specra-0.2.9.tgz \
  src/lib/server/ \
  package.json \
  package-lock.json \
  --directory=/tmp/specra-prod-deps node_modules/

echo "Uploading..."
scp specra-deploy.tar.gz root@46.101.48.218:/home/kamau/specra/

echo "Deploying on server..."
ssh root@46.101.48.218 'cd /home/kamau/specra && tar -xzf specra-deploy.tar.gz && rm specra-deploy.tar.gz && npx prisma generate && pm2 restart specra-docs'

echo "Cleaning up..."
rm specra-deploy.tar.gz

echo "Done! App redeployed."
```

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## PM2 Useful Commands

```bash
pm2 status              # check if app is running
pm2 logs specra-docs    # view app logs
pm2 restart specra-docs # restart after env changes
pm2 stop specra-docs    # stop the app
pm2 monit               # real-time monitoring
```

---

## Gotchas

| Problem | Cause | Fix |
|---|---|---|
| `npm install` killed on server | OOM — server has limited RAM | Build node_modules locally, include in tarball |
| `PrismaClient` import error on server | Node version mismatch (local vs server) | Run `npx prisma generate` on the server after extracting |
| `seed-admin.ts` can't find `db` module | `src/lib/server/db.ts` not in tarball | Include `src/lib/server/db.ts` in tar command |
| Build fails with "Missing API key" | Stripe/Resend init at build time | Pass `STRIPE_SECRET_KEY` and `RESEND_API_KEY` as env vars during build |
| Tarball extracts to wrong location | `scp` target path vs `tar -xzf` path mismatch | `scp` directly into `/home/kamau/specra/`, then `cd` there before extracting |

---

## Summary

| | First Deployment | Update |
|---|---|---|
| Build | `npm run build` (with placeholder env vars) | Same |
| node_modules | Build locally in `/tmp/specra-prod-deps/` | Same (skip if deps unchanged) |
| Package | `tar -czf` with build/, node_modules/, static/, docs/, prisma/, server.ts, src/lib/server/, SDK tgz | Same |
| Transfer | `scp` to `/home/kamau/specra/` | Same |
| Server: extract | `tar -xzf` in `/home/kamau/specra/` | Same |
| Server: prisma | `npx prisma generate && npx prisma db push && npx tsx scripts/seed-admin.ts` | `npx prisma generate` (+ `db push` only if schema changed) |
| Server: start | `pm2 start "node --import tsx server.ts"` | `pm2 restart specra-docs` |
| Caddy | Configure reverse proxy to `:3000` | No change |
| .env | Copy `.env.sample`, fill in real values | No change (unless adding new vars) |

---

## Part C: User Project Deployment Setup

This section covers the additional infrastructure needed for the user project deployment feature — where users deploy their documentation projects as Docker containers with `{subdomain}.docs.specra-docs.com` subdomains.

### 1. Install Docker

```bash
ssh root@46.101.48.218

curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker kamau

# Verify
docker --version
docker run hello-world
```

Log out and back in for the group change to take effect.

### 2. Create Projects Data Directory

```bash
sudo mkdir -p /data/specra/projects
sudo chown kamau:kamau /data/specra/projects
```

### 3. Build and Transfer Docker Base Images

The server has limited RAM, so build the images locally and transfer them.

**On your local machine:**

```bash
cd /home/kamau/Development/Projects/specra/specra-docs

# Build runtime image
docker build -t specra/docs-base:latest docker/docs-base/

# Build builder image
docker build -t specra/docs-builder:latest docker/docs-builder/

# Save and compress
docker save specra/docs-base:latest specra/docs-builder:latest | gzip > specra-images.tar.gz

# Transfer to server
scp specra-images.tar.gz root@46.101.48.218:/home/kamau/
```

**On the server:**

```bash
docker load < /home/kamau/specra-images.tar.gz
rm /home/kamau/specra-images.tar.gz

# Verify
docker images | grep specra
```

### 4. Configure Wildcard DNS

In your DNS provider (e.g., DigitalOcean, Cloudflare), add:

| Type | Name | Value |
|------|------|-------|
| A | `*.docs.specra-docs.com` | `46.101.48.218` |

Verify:
```bash
dig test.docs.specra-docs.com
# Should return 46.101.48.218
```

### 5. Update Caddy Configuration

Rename the server name in `~/caddy.json` from `static_sites` to `srv0` so it matches what the application code expects. Alternatively, set `CADDY_SERVER_NAME=static_sites` in `.env`.

Reload Caddy after changes:
```bash
curl localhost:2019/load \
  -H "Content-Type: application/json" \
  -d @~/caddy.json
```

### 6. Add Deployment Environment Variables

The deployment-related env vars are already included in `.env.sample` under the "User Project Deployment" section. If you set up `.env` before Part C existed, add the missing vars from `.env.sample` and restart:

```bash
pm2 restart specra-docs
```

### 7. Verification

```bash
# Docker is installed and images are loaded
docker images | grep specra

# Projects directory exists
ls -la /data/specra/projects/

# Caddy admin API is reachable
curl http://localhost:2019/config/

# DNS resolves (after propagation)
dig test.docs.specra-docs.com

# Deploy a test project via the dashboard and verify the subdomain resolves
```
