# Specra Documentation Site

**Specra** is a modern documentation framework built on SvelteKit that makes it easy to create beautiful, fast, and searchable documentation sites. With built-in support for MDX, versioning, API documentation generation, and customizable themes, Specra helps you focus on writing great docs.

The docs can be found here https://specra-docs.com/

## Quick Start

### Create a New Documentation Site

The fastest way to get started is with `create-specra`:

```bash
npx create-specra@latest my-docs
cd my-docs
npm install
cp .env.sample .env # update DATABASE_URL with user, password and database name
npx prism generate && npx prims migrate dev  ## run migrations 
npx auth secret   # generate secret for auth
#[Optional] set ADMIN_EMAIL="user email" # this will seed the system with admin user
npm run dev
```

This will scaffold a complete documentation site with:
- Pre-configured SvelteKit setup
- Sample documentation structure
- Ready-to-use UI components
- Version management
- Search functionality
- Responsive design

Open [http://localhost:5173](http://localhost:5173) to see your documentation site running locally.

### Already Created a Project?

If you've already created your project with `create-specra`, just install dependencies and start:

```bash
npm install
npm run dev
# or
yarn install && yarn dev
# or
pnpm install && pnpm dev
```

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
    "url": "https://yourdocs.com"
  },
  "navigation": {
    "links": [
      { "title": "Home", "href": "/" },
      { "title": "Docs", "href": "/docs" }
    ]
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
