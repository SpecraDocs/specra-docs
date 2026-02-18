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
npm run build
npm run preview
# or for production:
node build
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

### Self-Hosted with Docker + Caddy (Production)

See `deploy/README.md` for the complete deployment guide. Uses:
- Docker for containerization
- Caddy for reverse proxy + automatic HTTPS
- PostgreSQL for database

```bash
cd deploy
./scripts/setup.sh
./scripts/deploy.sh
```

### Vercel

```bash
npm run build
# Deploy via Vercel CLI or dashboard
```

### Netlify

```bash
npm run build
# Deploy the build/ directory
```

## Need Help?

- Check the [documentation](https://specra-docs.com/docs)
- Report issues on [GitHub](https://github.com/dalmasonto/specra-docs/issues)
