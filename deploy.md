# Specra-Docs Deployment Guide (Self-Hosted with Caddy)

**Key change**: specra-docs is now a full SaaS (API routes, database, auth, payments) — it can no longer be deployed as a static export. It needs a **running Node.js server** with Caddy as a **reverse proxy** instead of a file server.

---

## Step 1: Install Prerequisites on the Server

SSH into your server:
```bash
ssh kamau@kamau-tools
```

**Install Node.js 22** (if not already installed):
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # verify
```

**Install PostgreSQL 16** (if not already installed):
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

**Install PM2** (process manager to keep the app running):
```bash
sudo npm install -g pm2
```

---

## Step 2: Build Locally (Standalone Mode)

On your **local machine** (`/home/kamau/Development/Projects/specra/specra-docs/`):

```bash
cd /home/kamau/Development/Projects/specra/specra-docs

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build in standalone mode (this is the default, NOT export)
npm run build
```

This produces `build/` — a self-contained Node.js server (via `@sveltejs/adapter-node`).

---

## Step 3: Package and Transfer to Server

```bash
cd /home/kamau/Development/Projects/specra/specra-docs

# Create a deployment package with only what's needed
tar -czf specra-deploy.tar.gz \
  build/ \
  public/ \
  prisma/ \
  prisma.config.ts \
  scripts/ \
  node_modules/.prisma/ \
  node_modules/@prisma/ \
  package.json

# Transfer to server
scp specra-deploy.tar.gz kamau@kamau-tools:~/
```

---

## Step 4: Set Up on the Server

SSH into the server:
```bash
ssh kamau@kamau-tools

# Back up old static specra directory
mv ~/specra ~/specra-static-backup

# Create new directory and extract
mkdir -p ~/specra
cd ~/specra
tar -xzf ~/specra-deploy.tar.gz

# Clean up
rm ~/specra-deploy.tar.gz
```

---

## Step 5: Create Environment File on the Server

```bash
nano ~/specra/.env
```

Paste and edit these values (use your **production** values):

```env
# Database (use the password you set in Step 1)
DATABASE_URL="postgresql://specra:your-secure-password@localhost:5432/specra"

# Auth.js — generate a new secret for production
AUTH_SECRET="run: openssl rand -base64 32"
AUTH_GITHUB_ID="your-production-github-oauth-id"
AUTH_GITHUB_SECRET="your-production-github-oauth-secret"

# Stripe (use LIVE keys for production, test keys for staging)
STRIPE_SECRET_KEY="sk_live_..."
PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# M-Pesa
MPESA_CONSUMER_KEY="your-consumer-key"
MPESA_CONSUMER_SECRET="your-consumer-secret"
MPESA_SHORTCODE="your-business-shortcode"
MPESA_PASSKEY="your-passkey"
MPESA_CALLBACK_URL="https://specra-docs.com/api/mpesa/callback"
MPESA_ENV="production"

# App URL — MUST match your domain
PUBLIC_APP_URL="https://specra-docs.com"

# Admin
ADMIN_EMAIL=kennkamau09@gmail.com
ADMIN_PASSWORD=your-secure-admin-password

# Cron & Email
CRON_SECRET="run: openssl rand -hex 16"
RESEND_API_KEY="re_..."

# Invoice/Billing
COMPANY_NAME="Your Company Name"
COMPANY_ADDRESS="Your Company Address"
COMPANY_EMAIL="billing@specra-docs.com"
DEFAULT_TAX_RATE="0"
```

---

## Step 6: Run Database Migrations & Seed

```bash
cd ~/specra

# Install tsx globally if not available
sudo npm install -g tsx

# Push the Prisma schema to the database
npx prisma db push

# Seed the admin user
npx tsx scripts/seed-admin.ts
```

---

## Step 7: Start the App with PM2

```bash
cd ~/specra

# The SvelteKit adapter-node entry point
pm2 start build/index.js \
  --name specra-docs \
  --env production \
  --cwd /home/kamau/specra

# Save PM2 process list so it restarts on reboot
pm2 save
pm2 startup  # follow the printed command to enable on boot
```

The app will now be running on **port 3000**.

Verify it's working:
```bash
curl http://localhost:3000
```

---

## Step 8: Update Caddy Config (Reverse Proxy)

The critical change — Caddy must **reverse proxy** to the Node.js server instead of serving static files.

Edit your `caddy.json`:
```bash
nano ~/caddy.json
```

Change **only** the specra-docs.com route from `file_server` to `reverse_proxy`:

```json
{
  "apps": {
    "http": {
      "servers": {
        "static_sites": {
          "listen": [":80", ":443"],
          "routes": [
            {
              "match": [
                {
                  "host": ["koru.africa"]
                }
              ],
              "handle": [
                {
                  "handler": "file_server",
                  "root": "/home/kamau/koru"
                }
              ]
            },
            {
              "match": [
                {
                  "host": ["hopium.koru.africa"]
                }
              ],
              "handle": [
                {
                  "handler": "file_server",
                  "root": "/home/kamau/hopium"
                }
              ]
            },
            {
              "match": [
                {
                  "host": ["stratos.koru.africa"]
                }
              ],
              "handle": [
                {
                  "handler": "file_server",
                  "root": "/home/kamau/stratos"
                }
              ]
            },
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
          ]
        }
      }
    }
  }
}
```

Reload Caddy:
```bash
curl localhost:2019/load \
  -H "Content-Type: application/json" \
  -d @caddy.json
```

All other domains (koru.africa, hopium, stratos) remain untouched as static file servers.

---

## Step 9: Set Up Stripe Webhook (Production)

In your Stripe Dashboard:
1. Go to **Developers → Webhooks**
2. Add endpoint: `https://specra-docs.com/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy the webhook signing secret and update `STRIPE_WEBHOOK_SECRET` in `~/specra/.env`
5. Restart the app: `pm2 restart specra-docs`

---

## Step 10: Set Up GitHub OAuth (Production)

Update your GitHub OAuth App:
1. Go to **GitHub → Settings → Developer Settings → OAuth Apps**
2. Set **Homepage URL**: `https://specra-docs.com`
3. Set **Authorization callback URL**: `https://specra-docs.com/api/auth/callback/github`
4. Update `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` in `~/specra/.env`
5. Restart: `pm2 restart specra-docs`

---

## Future Deployments (Quick Redeploy Script)

On your **local machine**, create `deploy.sh` in the project root:

```bash
#!/bin/bash
set -e

cd /home/kamau/Development/Projects/specra/specra-docs

echo "Building..."
npm run build

echo "Packaging..."
tar -czf specra-deploy.tar.gz \
  build/ \
  public/ \
  prisma/ \
  prisma.config.ts \
  scripts/ \
  node_modules/.prisma/ \
  node_modules/@prisma/ \
  package.json

echo "Uploading..."
scp specra-deploy.tar.gz kamau@kamau-tools:~/

echo "Deploying on server..."
ssh kamau@kamau-tools 'cd ~/specra && tar -xzf ~/specra-deploy.tar.gz && rm ~/specra-deploy.tar.gz && pm2 restart specra-docs'

echo "Done! App redeployed."
rm specra-deploy.tar.gz
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

## Summary: Old vs New Deployment

| | Old (Static) | New (SaaS) |
|---|---|---|
| Build command | `npm run build:export` | `npm run build` |
| Output | `out/` (HTML files) | `build/` (Node.js server via adapter-node) |
| Caddy handler | `file_server` | `reverse_proxy` to `:3000` |
| Database | None | PostgreSQL required |
| Process manager | None | PM2 |
| Environment vars | None | `.env` with all secrets |
