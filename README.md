# Specra Documentation Site

**Specra** is a modern documentation framework built on SvelteKit that makes it easy to create beautiful, fast, and searchable documentation sites. With built-in support for MDX, versioning, API documentation generation, and customizable themes, Specra helps you focus on writing great docs.

The docs can be found here https://specra-docs.com/

## Quick Start

### Create a New Documentation Site (SDK)

The fastest way to create a self-hosted documentation site:

```bash
npx create-specra@latest my-docs
cd my-docs
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to see your docs running locally.

The CLI offers **3 templates**:
- **Minimal** — Clean starting point with basic structure
- **Book Docs** — Knowledge base style with dark theme and categorized sidebar
- **JBrains Docs** — Reference docs style with light theme and tab groups

```bash
npx create-specra my-docs --template book-docs
npx create-specra my-docs --template jbrains-docs
```

### Running This SaaS Site (specra-docs)

This repository is the official Specra documentation site **and** a full SaaS platform. To run it locally:

```bash
npm install
cp .env.sample .env       # Update DATABASE_URL, auth secrets, Stripe/M-Pesa keys
npx prisma generate       # Generate Prisma client
npx prisma migrate dev    # Run database migrations
npx auth secret           # Generate Auth.js secret
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to see the site running locally.

## Project Structure

```
├── src/
│   ├── routes/              # SvelteKit routes
│   │   ├── +layout.svelte   # Root layout
│   │   ├── +layout.server.ts
│   │   ├── +page.svelte     # Landing page
│   │   ├── auth/            # Auth pages (login, register)
│   │   ├── dashboard/       # User dashboard
│   │   ├── admin/           # Admin panel
│   │   ├── pricing/         # Pricing page
│   │   ├── checkout/        # Checkout page
│   │   ├── docs/            # Documentation pages
│   │   └── api/             # API routes
│   ├── lib/
│   │   ├── server/          # Server-side utilities
│   │   │   ├── auth.ts      # Auth.js configuration
│   │   │   ├── db.ts        # Prisma client
│   │   │   ├── stripe.ts    # Stripe client
│   │   │   └── mpesa.ts     # M-Pesa client
│   │   └── components/      # Shared Svelte components
│   ├── hooks.server.ts      # Auth middleware & route protection
│   └── app.html             # HTML template
├── docs/                    # Your MDX documentation files
│   └── v1.0.0/              # Version 1.0.0 docs
├── prisma/
│   └── schema.prisma        # Database schema
├── static/                  # Static assets
├── deploy/                  # Deployment configs (Docker, Caddy, scripts)
├── specra.config.json       # Specra configuration
├── svelte.config.js         # SvelteKit configuration
└── vite.config.ts           # Vite configuration
```

## Writing Documentation

Add your MDX files in the `docs/v1.0.0/` directory:

```mdx
---
title: My Page
description: This is my documentation page
---

# My Page

Your content here...
```

### Using Components

Specra provides built-in components for your documentation:

```mdx
<Callout type="info">
  This is an info callout!
</Callout>

<Tabs>
  <Tab title="JavaScript">
    ```js
    console.log('Hello World')
    ```
  </Tab>
  <Tab title="TypeScript">
    ```ts
    console.log('Hello World')
    ```
  </Tab>
</Tabs>
```

## Configuration

Edit `specra.config.json` to customize your site:

```json
{
  "site": {
    "title": "Your Docs",
    "description": "Your documentation site",
    "url": "https://yourdocs.com",
    "activeVersion": "v1.0.0"
  },
  "theme": {
    "defaultMode": "system",
    "respectPrefersColorScheme": true
  },
  "navigation": {
    "showSidebar": true,
    "collapsibleSidebar": true,
    "showBreadcrumbs": true,
    "showTableOfContents": true,
    "sidebarStyle": "card"
  },
  "features": {
    "versioning": true,
    "showReadingTime": true
  }
}
```

## Building for Production

```bash
npx prisma generate
STRIPE_SECRET_KEY="sk_test_placeholder" RESEND_API_KEY="re_placeholder" npm run build

# Preview locally:
npm run preview

# Or start with custom server (WebSocket support):
node --import tsx server.ts
```

## SaaS Features

This site includes a full SaaS layer on top of the documentation:
- **Authentication** - Auth.js with GitHub OAuth + email/password
- **Pricing Tiers** - Free, Starter ($19/mo), Pro ($49/mo), Enterprise ($149/mo)
- **Dual Payments** - Stripe (international, USD) + M-Pesa Daraja (Kenya, KES)
- **User Dashboard** - Plan management, billing history, settings
- **Admin Panel** - User management, analytics, coupons, subscriptions
- **Database** - PostgreSQL via Prisma v7

## Specra Architecture

Specra is composed of three packages:

```
specra (SDK)          →  Core library: Svelte components, MDX processing, config types
  ↓
create-specra (CLI)   →  Scaffolding tool: generates new doc sites from templates
  ↓
specra-docs (this)    →  Official site: documentation + SaaS platform (auth, billing, dashboard)
```

- **specra** (npm: `specra`) — The SDK that powers all documentation sites. Provides layout components, sidebar, header, search, theming, versioning, and MDX processing. Users install this as a dependency.
- **create-specra** (npm: `create-specra`) — The CLI that scaffolds new projects. Copies template files (SvelteKit boilerplate + sample docs + config) and installs dependencies.
- **specra-docs** (this repo) — The official documentation site at [specra-docs.com](https://specra-docs.com). Also serves as a SaaS platform with authentication, subscription billing (Stripe + M-Pesa), user dashboard, and admin panel. The SaaS layer is specific to this repo and does not affect the SDK.

## Learn More

- [Specra Documentation](https://specra-docs.com/docs)
- [SvelteKit Documentation](https://svelte.dev/docs/kit)
- [MDX Documentation](https://mdxjs.com)

## Deployment

### Self-Hosted VPS with PM2 + Caddy (Production)

See [`deploy.md`](deploy.md) for the full guide. The server has limited RAM so all dependencies are built locally and shipped in the tarball.

**First deployment:**
```bash
# Local: build app + prod node_modules, package everything, upload
STRIPE_SECRET_KEY="sk_test_placeholder" RESEND_API_KEY="re_placeholder" npm run build
# Build prod deps in /tmp (server can't run npm install — OOM)
mkdir -p /tmp/specra-prod-deps && cp package.json package-lock.json specra-0.2.9.tgz /tmp/specra-prod-deps/
cd /tmp/specra-prod-deps && npm install --omit=dev && cd -
# Package with node_modules included
tar -czf specra-deploy.tar.gz build/ static/ docs/ prisma/ prisma.config.ts scripts/ server.ts specra.config.json specra-0.2.9.tgz src/lib/server/db.ts package.json package-lock.json --directory=/tmp/specra-prod-deps node_modules/
scp specra-deploy.tar.gz root@46.101.48.218:/home/kamau/specra/

# Server: extract, generate prisma client, migrate, seed, start
ssh root@46.101.48.218
cd /home/kamau/specra && tar -xzf specra-deploy.tar.gz && rm specra-deploy.tar.gz
npx prisma generate && npx prisma db push && npx tsx scripts/seed-admin.ts
pm2 start "node --import tsx server.ts" --name specra-docs --cwd /home/kamau/specra
```

**Updates:**
```bash
# Local: rebuild and upload (or use deploy.sh)
./deploy.sh
# Server: extract, regenerate prisma, restart
ssh root@46.101.48.218 'cd /home/kamau/specra && tar -xzf specra-deploy.tar.gz && rm specra-deploy.tar.gz && npx prisma generate && pm2 restart specra-docs'
```

### Docker + Caddy (Alternative)

See [`deploy/README.md`](deploy/README.md) for the Docker-based deployment guide.

## Need Help?

- Check the [documentation](https://specra-docs.com/docs)
- Report issues on [GitHub](https://github.com/dalmasonto/specra-docs/issues)
