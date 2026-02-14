# Specra Docs - Claude Developer Guide

## Introduction
Hello Claude! This document helps you understand specra-docs, the official documentation website for the Specra framework. This project is special because it's both the documentation for Specra AND a real-world implementation built with Specra itself.

## Project Context

### What is specra-docs?
specra-docs is a SvelteKit website that:
- **Documents Specra**: Provides comprehensive guides, API references, and tutorials
- **Demonstrates Specra**: Shows all features in a production environment
- **Validates Specra**: Uses the SDK it documents (dogfooding)
- **Onboards Users**: First stop for developers learning Specra

### The Circular Relationship
```
┌─────────────────┐
│   specra-sdk    │ ◄─── Built with this
│  (The Product)  │
└────────┬────────┘
         │
         │ is documented by
         ▼
┌─────────────────┐
│  specra-docs    │ ◄─── You are here
│ (Documentation) │
└────────┬────────┘
         │
         │ refers users to
         ▼
┌─────────────────┐
│  create-specra  │
│     (CLI)       │
└─────────────────┘
```

**Key Insight**: This site IS a Specra documentation site, documenting HOW to build Specra documentation sites. It's meta, but powerful - users can inspect the source code to see exactly how features work.

### Project Relationships

| Project | What It Does | How specra-docs Relates |
|---------|-------------|-------------------------|
| **specra-sdk** | Provides the framework | specra-docs uses it as dependency |
| **create-specra** | Scaffolds new projects | specra-docs documents how to use it |
| **specra-docs** | Documents everything | This project, uses SDK to document SDK |

## Architecture Overview

### Technology Stack
```
Framework Layer:
├── SvelteKit 16.1.0 (App Router, React Server Components)
├── React 19.2.3
└── TypeScript 5

Documentation Layer:
├── Specra 0.1.11 (the SDK itself!)
└── MDX (via Specra's MDX processor)

Styling:
├── Tailwind CSS 4.1.9
├── @tailwindcss/typography (for prose)
└── PostCSS

Payment & Auth Layer (SaaS):
├── Auth.js v5 (auth.js@beta) - GitHub OAuth + credentials
├── Prisma v7 + PostgreSQL - Database ORM
├── Stripe (Checkout + Webhooks + Customer Portal) - International payments
├── M-Pesa Daraja API (STK Push) - Kenya payments (KES)
└── bcryptjs - Password hashing

Optional Features:
├── MeiliSearch (search, currently disabled)
└── Analytics (Google Analytics, Plausible - ready to use)

Build & Deploy:
├── Self-hosted server with Caddy reverse proxy (production)
├── SvelteKit standalone mode (not static export)
├── tsx (script execution)
└── ESLint (linting)
```

### Project Structure Deep Dive

```
specra-docs/
├── app/                          # SvelteKit App Router
│   ├── layout.tsx                # Root layout
│   │   └── Uses specra/app/layout with custom wrapper
│   ├── page.tsx                  # Landing page (hero, features, CTA)
│   ├── globals.css               # Global styles (imports specra styles)
│   ├── not-found.tsx             # Custom 404 page
│   │
│   ├── docs/                     # Documentation routes
│   │   └── [version]/
│   │       └── [...slug]/
│   │           └── page.tsx      # Re-exports specra/app/docs-page
│   │
│   ├── auth/                     # Authentication pages
│   │   ├── login/page.tsx        # Login (GitHub OAuth + email/password)
│   │   └── register/page.tsx     # Registration
│   │
│   ├── pricing/                  # Public pricing page
│   │   └── page.tsx              # 4 tiers, monthly/annual, USD/KES toggle
│   │
│   ├── dashboard/                # Authenticated user dashboard
│   │   ├── layout.tsx            # Dashboard sidebar layout + auth guard
│   │   ├── page.tsx              # Overview (plan, status, payment method)
│   │   ├── billing/
│   │   │   ├── page.tsx          # Subscription & payment history
│   │   │   └── manage-button.tsx # Stripe portal button (client component)
│   │   └── settings/
│   │       └── page.tsx          # Account settings
│   │
│   └── api/                      # API routes
│       ├── auth/
│       │   ├── # Handled by @auth/sveltekit in hooks  # Auth.js handler
│       │   └── register/route.ts       # User registration
│       ├── stripe/
│       │   ├── checkout/route.ts       # Create Stripe Checkout session
│       │   └── portal/route.ts         # Create Customer Portal session
│       ├── webhooks/
│       │   └── stripe/route.ts         # Stripe webhook handler
│       └── mpesa/
│           ├── stkpush/route.ts        # M-Pesa STK Push
│           ├── callback/route.ts       # M-Pesa payment callback
│           └── status/route.ts         # Query transaction status
│
├── lib/                          # Shared utilities (payment system)
│   ├── db.ts                     # Prisma client singleton
│   ├── auth-utils.ts             # Auth helpers (getCurrentUser, getUserSubscription)
│   ├── stripe.ts                 # Stripe client + plan pricing constants
│   └── mpesa.ts                  # M-Pesa Daraja client (OAuth, STK Push, query)
│
├── prisma/                       # Database schema
│   ├── schema.prisma             # 7 models, 5 enums (User, Plan, Subscription, Payment...)
│   └── prisma.config.ts          # Prisma v7 config (datasource URL)
│
├── auth.ts                       # Auth.js v5 configuration
├── middleware.ts                  # Route protection (dashboard requires auth)
│
├── docs/                         # Documentation content (MDX)
│   └── v1.0.0/                   # Version 1.0.0 docs
│       ├── getting-started/
│       ├── configuration/
│       ├── components/
│       ├── api/
│       ├── guides/
│       └── examples/
│
├── public/                       # Static assets
│   ├── icon-light-32x32.png
│   ├── icon-dark-32x32.png
│   ├── logo.svg
│   └── images/
│
├── scripts/                      # Build and utility scripts
│   ├── generate-redirects.mjs
│   ├── generate-static-redirects.mjs
│   ├── index-search.ts
│   └── test-search.ts
│
├── specra.config.json            # Specra configuration
├── svelte.config.js               # SvelteKit config (1 line - simple!)
├── tsconfig.json                 # TypeScript configuration
├── postcss.config.mjs            # PostCSS configuration
├── package.json                  # Dependencies and scripts
├── .env.local                    # Environment variables (DB, Auth, Stripe, M-Pesa)
└── redirects.json                # Redirect rules
```

## Key Files Explained

### 1. app/layout.tsx
```typescript
// Custom layout wrapping Specra's layout
import { ReactNode } from 'react'
import SpecraLayout from 'specra/app/layout'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return <SpecraLayout>{children}</SpecraLayout>
}

export { generateMetadata } from 'specra/app/layout'
```

**Purpose**: Wraps Specra's layout, allows for global styles and customization.

### 2. app/page.tsx (Landing Page)
```typescript
// Custom landing page (not using Specra's docs template)
import { goto } from '$app/navigation'
import { Button } from 'specra/components'

export default function Home() {
  return (
    <div className="container">
      <section className="hero">
        <h1>Specra</h1>
        <p>Modern documentation for SvelteKit</p>
        <Link href="/docs/v1.0.0/getting-started">
          <Button>Get Started →</Button>
        </Link>
      </section>

      <section className="features">
        {/* Feature cards */}
      </section>

      <section className="cta">
        {/* Call to action */}
      </section>
    </div>
  )
}
```

**Purpose**: Custom marketing page separate from documentation.

### 3. app/docs/[version]/[...slug]/page.tsx
```typescript
// Simply re-exports Specra's docs page
export { default } from 'specra/app/docs-page'
export {
  generateStaticParams,
  generateMetadata,
} from 'specra/app/docs-page'
```

**Purpose**: Delegates all documentation rendering to Specra. This is the magic - no custom code needed!

### 4. specra.config.json (The Brain)
```json
{
  "$schema": "./node_modules/specra/config/specra.config.schema.json",
  "site": {
    "title": "Specra Docs",
    "description": "Comprehensive documentation for your project",
    "url": "https://specra.vercel.app",
    "baseUrl": "/",
    "language": "en",
    "organizationName": "dalmasonto",
    "projectName": "specra",
    "activeVersion": "v1.0.0",
    "favicon": "/icon-light-32x32.png"
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
    "tocPosition": "right",
    "tocMaxDepth": 3,
    "tabGroups": [
      {
        "id": "guides",
        "label": "Guides",
        "icon": "book-open"
      },
      {
        "id": "api",
        "label": "API Reference",
        "icon": "zap"
      },
      {
        "id": "components",
        "label": "Components",
        "icon": "layers"
      }
    ]
  },
  "social": {
    "github": "https://github.com/dalmasonto/specra-docs",
    "twitter": "https://twitter.com/dalmasonto",
    "discord": "https://discord.com/invite/dalmasonto"
  },
  "search": {
    "enabled": false,
    "provider": "meilisearch",
    "meilisearch": {
      "host": "http://localhost:7700",
      "apiKey": "aSampleMasterKey",
      "indexName": "docs"
    }
  },
  "footer": {
    "copyright": "Copyright © 2026 Specra. All rights reserved.",
    "links": [
      {
        "title": "Documentation",
        "items": [
          { "label": "Getting Started", "href": "/docs/v1.0.0/getting-started" },
          { "label": "API Reference", "href": "/docs/v1.0.0/api" }
        ]
      }
    ]
  }
}
```

**Purpose**: Configures every aspect of Specra's behavior.

### 5. svelte.config.js (Minimal!)
```javascript
// That's it - one line!
// svelte.config.js imports specra/svelte-config
```

**Purpose**: Uses Specra's SvelteKit configuration. No custom config needed!

### 6. docs/v1.0.0/getting-started/introduction.mdx (Content)
```mdx
---
title: Introduction to Specra
description: Learn what Specra is and why you should use it
tabGroup: guides
order: 1
---

# Introduction to Specra

Specra is a modern documentation framework for SvelteKit...

## Features

- **MDX Support** - Write in Markdown with React components
- **Versioning** - Manage multiple doc versions
- **Search** - Full-text search integration
- **Themes** - Dark and light modes

## Quick Example

import { Callout } from 'specra/components'

<Callout type="info">
  This entire site is built with Specra!
</Callout>

## Next Steps

Check out the [Installation Guide](/docs/v1.0.0/getting-started/installation).
```

**Purpose**: Actual documentation content. MDX allows mixing Markdown with React components.

## Configuration Deep Dive

### Tab Groups
```json
{
  "navigation": {
    "tabGroups": [
      {
        "id": "guides",
        "label": "Guides",
        "icon": "book-open"
      },
      {
        "id": "api",
        "label": "API Reference",
        "icon": "zap"
      },
      {
        "id": "components",
        "label": "Components",
        "icon": "layers"
      }
    ]
  }
}
```

**What This Does**:
- Creates 3 navigation tabs at the top
- Each tab can have its own sidebar structure
- Documents specify which tab via frontmatter: `tabGroup: guides`
- Helps organize large documentation into logical sections

### Social Links
```json
{
  "social": {
    "github": "https://github.com/dalmasonto/specra-docs",
    "twitter": "https://twitter.com/dalmasonto",
    "discord": "https://discord.com/invite/dalmasonto",
    "custom": [
      {
        "label": "Website",
        "url": "https://craftfolio.com/dalmasonto"
      }
    ]
  }
}
```

**What This Does**:
- Adds social icons to header/footer
- Built-in support for common platforms
- Custom links for anything else

### Footer Configuration
```json
{
  "footer": {
    "copyright": "Copyright © 2026 Specra. All rights reserved.",
    "links": [
      {
        "title": "Documentation",
        "items": [
          { "label": "Getting Started", "href": "/docs/v1.0.0/getting-started" }
        ]
      },
      {
        "title": "Community",
        "items": [
          { "label": "GitHub", "href": "https://github.com/dalmasonto/specra-docs" }
        ]
      }
    ],
    "branding": {
      "showBranding": true,
      "logo": "https://..."
    }
  }
}
```

**What This Does**:
- Creates organized footer with link columns
- Copyright notice
- Optional branding logo

## Build Scripts Explained

### 1. Development
```bash
npm run dev
# → vite dev
# Starts local development server at http://localhost:3000
```

### 2. Production Build (Server Mode — Required for Payment System)
```bash
npm run build
# → npm run generate:redirects && vite build
#
# 1. Generates redirect rules
# 2. Builds with output: "standalone" (supports API routes, Auth.js, webhooks)
# 3. Run with: npm start (or PM2/systemd)
# 4. Caddy reverse proxies to localhost:3000
```

### 3. Static Export (GitHub Pages — No payment features)
```bash
npm run build:export
# → npm run generate:redirects &&
#    NEXT_PUBLIC_BASE_PATH=/specra-docs
#    NEXT_BUILD_MODE=export
#    vite build &&
#    npm run generate:static-redirects
#
# 1. Generates redirects
# 2. Sets base path for subdirectory hosting
# 3. Exports to static HTML (out/)
# 4. Creates static redirect files
# NOTE: No API routes, no auth, no payment features in this mode
```

### 4. Search Indexing
```bash
npm run index:search
# → tsx scripts/index-search.ts
#
# 1. Scans all MDX files in docs/
# 2. Extracts content and metadata
# 3. Pushes to MeiliSearch instance
```

### 5. Search Testing
```bash
npm run test:search
# → tsx scripts/test-search.ts
#
# Tests search queries against indexed content
```

## Scripts Deep Dive

### scripts/generate-redirects.mjs
**Purpose**: Creates redirect rules for proper routing

```javascript
// Generates redirects.json
// Example: /docs → /docs/v1.0.0 (default version)
{
  "/docs": "/docs/v1.0.0",
  "/docs/": "/docs/v1.0.0/"
}
```

### scripts/generate-static-redirects.mjs
**Purpose**: Creates HTML redirect files for static hosting

```javascript
// For GitHub Pages, creates out/docs.html:
<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="refresh" content="0; url=/specra-docs/docs/v1.0.0">
  </head>
</html>
```

### scripts/index-search.ts
**Purpose**: Indexes documentation for search

```typescript
import { MeiliSearch } from 'meilisearch'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const client = new MeiliSearch({
  host: 'http://localhost:7700',
  apiKey: 'aSampleMasterKey'
})

// Read all MDX files
const docsDir = path.join(process.cwd(), 'docs/v1.0.0')
const files = getAllMdxFiles(docsDir)

// Index each file
const documents = files.map(file => {
  const content = fs.readFileSync(file, 'utf-8')
  const { data, content: body } = matter(content)

  return {
    id: file,
    title: data.title,
    description: data.description,
    content: body,
    url: fileToUrl(file)
  }
})

await client.index('docs').addDocuments(documents)
```

### scripts/test-search.ts
**Purpose**: Verify search is working

```typescript
import { MeiliSearch } from 'meilisearch'

const client = new MeiliSearch({
  host: 'http://localhost:7700',
  apiKey: 'aSampleMasterKey'
})

// Test query
const results = await client.index('docs').search('components', {
  limit: 5,
  attributesToHighlight: ['title', 'content']
})

console.log(`Found ${results.hits.length} results`)
results.hits.forEach(hit => {
  console.log(`- ${hit.title}: ${hit.url}`)
})
```

## Development Workflow

### Setting Up
```bash
# Clone repository
git clone https://github.com/dalmasonto/specra-docs.git
cd specra-docs

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Adding Documentation

#### 1. Create MDX File
```bash
# Create new guide
touch docs/v1.0.0/guides/my-new-guide.mdx
```

#### 2. Write Content
```mdx
---
title: My New Guide
description: Learn how to do something
tabGroup: guides
order: 10
---

# My New Guide

Content goes here...

## Section 1

More content...
```

#### 3. View Changes
- SvelteKit hot-reloads automatically
- Navigate to `/docs/v1.0.0/guides/my-new-guide`
- Appears in sidebar automatically

### Customizing Configuration

#### 1. Edit specra.config.json
```json
{
  "theme": {
    "primaryColor": "#your-color"
  }
}
```

#### 2. Save and Reload
Changes take effect immediately in development.

### Adding Components to MDX

```mdx
---
title: Component Example
---

import { Callout, Tabs, Tab } from 'specra/components'

# Component Examples

<Callout type="warning">
  This is a warning callout!
</Callout>

<Tabs>
  <Tab title="JavaScript">
    ```js
    console.log('Hello')
    ```
  </Tab>
  <Tab title="TypeScript">
    ```ts
    console.log('Hello')
    ```
  </Tab>
</Tabs>
```

## Deployment

### Vercel (Current)
```bash
# Automatic deployment
# - Push to main branch
# - Vercel builds and deploys automatically
# - Uses npm run build
# - Live at https://specra.vercel.app
```

**Configuration**:
- Build Command: `npm run build`
- Output Directory: `build`
- Install Command: `npm install`

### GitHub Pages (Alternative)
```bash
# Build static site
npm run build:export

# Output in out/
ls out/

# Deploy out/ to gh-pages branch
npm install -g gh-pages
gh-pages -d out
```

**Configuration Needed**:
```json
// specra.config.json
{
  "deployment": {
    "target": "github",
    "basePath": "/specra-docs",  // or "" if custom domain
    "customDomain": false         // or true if custom domain
  }
}
```

### Netlify
```bash
# Build: npm run build
# Publish: build
# Environment: Node 18+
```

## Search Integration (When Enabled)

### 1. Setup MeiliSearch
```bash
# Install MeiliSearch
curl -L https://install.meilisearch.com | sh

# Run
./meilisearch --master-key="aSampleMasterKey"
```

### 2. Enable in Config
```json
{
  "search": {
    "enabled": true,
    "provider": "meilisearch",
    "meilisearch": {
      "host": "http://localhost:7700",
      "apiKey": "aSampleMasterKey",
      "indexName": "docs"
    }
  }
}
```

### 3. Index Content
```bash
npm run index:search
```

### 4. Test
```bash
npm run test:search
# Or use the search UI in the browser
```

## Common Tasks

### Add New Documentation Page
1. Create MDX file in appropriate directory
2. Add frontmatter (title, description, tabGroup)
3. Write content
4. File automatically appears in navigation

### Change Theme Colors
```json
// specra.config.json
{
  "theme": {
    "primaryColor": "#0070f3",
    "defaultMode": "dark"  // or "light" or "system"
  }
}
```

### Add New Tab Group
```json
{
  "navigation": {
    "tabGroups": [
      // ... existing groups
      {
        "id": "tutorials",
        "label": "Tutorials",
        "icon": "graduation-cap"
      }
    ]
  }
}
```

Then in MDX:
```mdx
---
tabGroup: tutorials
---
```

### Update Social Links
```json
{
  "social": {
    "github": "your-github-url",
    "twitter": "your-twitter",
    // Add more platforms
  }
}
```

### Customize Footer
```json
{
  "footer": {
    "copyright": "Your copyright text",
    "links": [
      // Your link columns
    ]
  }
}
```

## Troubleshooting

### Styles Not Loading
- Check `app/globals.css` imports `specra/styles`
- Verify Tailwind configuration
- Clear cache: `rm -rf .svelte-kit build Clear `.next` cache: `rm -rf .next && npm run dev`Clear `.next` cache: `rm -rf .next && npm run dev` npm run dev`

### Documentation Not Appearing
- Check MDX file location (must be in `docs/v1.0.0/`)
- Verify frontmatter is valid YAML
- Check console for errors

### Search Not Working
- Ensure MeiliSearch is running
- Verify `search.enabled: true`
- Run `npm run index:search`
- Check API key and host in config

### Build Fails
- Check for syntax errors in MDX files
- Verify all imports are valid
- Check SvelteKit version compatibility
- Clear node_modules and reinstall

## Best Practices

### For Documentation Content
1. **Clear Frontmatter**: Always include title and description
2. **Logical Organization**: Use tab groups effectively
3. **Code Examples**: Provide working examples
4. **Cross-Links**: Link related pages
5. **Images**: Use relative paths in public/

### For Configuration
1. **Version Control**: Commit specra.config.json changes
2. **Comments**: Document custom settings
3. **Validation**: Use schema for auto-completion
4. **Testing**: Test in development before deploying

### For Maintenance
1. **Keep Updated**: Regular specra SDK updates
2. **Monitor**: Check for broken links
3. **Search**: Re-index after major content changes
4. **Performance**: Monitor build times

## Payment System (SaaS Billing)

specra-docs includes a full SaaS billing system with 4 pricing tiers, dual payment providers (Stripe + M-Pesa), and an authenticated user dashboard. This was added in February 2026.

### Pricing Tiers

| Tier | USD/mo | USD/mo (annual) | KES/mo |
|------|--------|-----------------|--------|
| Free | $0 | $0 | Free |
| Starter | $19 | $15 | KES 2,450 |
| Pro | $49 | $39 | KES 6,300 |
| Enterprise | $149 | $129 | KES 19,200 |

### Authentication (Auth.js v5)
- **Providers**: GitHub OAuth + email/password (credentials)
- **Session strategy**: JWT
- **Adapter**: Prisma (stores users, accounts, sessions in PostgreSQL)
- **Config**: `auth.ts` at project root
- **API route**: `app/api/auth/# Handled by @auth/sveltekit in hooks`
- **Registration**: `app/api/auth/register/route.ts` (bcrypt password hashing)
- **Middleware**: `middleware.ts` protects `/dashboard/*` routes, redirects logged-in users from `/auth/*`

### Database (Prisma v7 + PostgreSQL)
**Schema**: `prisma/schema.prisma`

Models:
- **User** - Auth.js user with optional password field
- **Account** - OAuth provider accounts (Auth.js required)
- **Session** - User sessions (Auth.js required)
- **VerificationToken** - Email verification (Auth.js required)
- **Plan** - Pricing tiers with Stripe price IDs, USD/KES amounts
- **Subscription** - User subscriptions (status, provider, billing interval, period)
- **Payment** - Payment records (amount, currency, provider, transaction ID)

Enums: `SubscriptionStatus`, `PaymentProvider`, `BillingInterval`, `Currency`, `PaymentStatus`

**IMPORTANT Prisma v7 notes**:
- `url` in datasource block is REMOVED from schema.prisma
- Connection URL configured in `prisma/prisma.config.ts` via `defineConfig({ datasource: { url } })`
- `datasourceUrl` constructor option is removed from PrismaClient — use plain `new PrismaClient()`
- Client singleton in `lib/db.ts`

### Stripe Integration
- **Client**: `lib/stripe.ts` — Stripe SDK singleton, API version `2026-01-28.clover`
- **Checkout**: `app/api/stripe/checkout/route.ts` — Creates Stripe Checkout sessions with plan metadata
- **Portal**: `app/api/stripe/portal/route.ts` — Customer Portal for subscription management
- **Webhooks**: `app/api/webhooks/stripe/route.ts` — Handles 4 events:
  - `checkout.session.completed` → creates Subscription + Payment records
  - `customer.subscription.updated` → syncs status and period
  - `customer.subscription.deleted` → marks as cancelled
  - `invoice.payment_failed` → marks as past_due, records failed payment

**IMPORTANT Stripe API (2026-01-28.clover) notes**:
- `current_period_start/end` moved from `Subscription` to `SubscriptionItem` — access via `subscription.items.data[0].current_period_start`
- `Invoice.subscription` replaced by `invoice.parent.subscription_details.subscription`
- `Invoice.payment_intent` removed — use `invoice.id` or `payment_settings`

### M-Pesa Daraja Integration
- **Client**: `lib/mpesa.ts` — OAuth token, STK Push, status query, phone normalization
- **STK Push**: `app/api/mpesa/stkpush/route.ts` — Initiates payment via phone prompt
- **Callback**: `app/api/mpesa/callback/route.ts` — Receives M-Pesa payment confirmations
- **Status**: `app/api/mpesa/status/route.ts` — Polls transaction status as fallback
- Supports sandbox and production environments via `MPESA_ENV`

### UI Pages
- **Pricing** (`app/pricing/page.tsx`): 4 tier cards, monthly/annual toggle, USD/KES currency switch, full feature comparison table
- **Login** (`app/auth/login/page.tsx`): GitHub OAuth + email/password form
- **Register** (`app/auth/register/page.tsx`): GitHub OAuth + registration form, auto-signs in after creation
- **Dashboard** (`app/dashboard/page.tsx`): Overview cards (current plan, status, payment method)
- **Billing** (`app/dashboard/billing/page.tsx`): Subscription details, Stripe portal button, payment history table
- **Settings** (`app/dashboard/settings/page.tsx`): Profile info, danger zone

### Build Mode
- The payment system requires **server mode** (`yarn build` / `NEXT_BUILD_MODE=default`) — NOT static export
- API routes and Auth.js middleware need a running SvelteKit server
- Production deployment: Caddy reverse proxy → `localhost:3000` (SvelteKit server)
- `build:export` remains available for users who don't need billing (self-hosted docs)

### Environment Variables (`.env.local`)
```
DATABASE_URL, AUTH_SECRET, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET,
STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET,
MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY,
MPESA_CALLBACK_URL, MPESA_ENV, NEXT_PUBLIC_APP_URL
```

## Why This Project Matters

### For Specra Users
- **Living Example**: See Specra in action
- **Source of Truth**: Official documentation
- **Learning Resource**: Study real implementation
- **Inspiration**: See what's possible

### For Specra Development
- **Dogfooding**: Catches SDK bugs early
- **Feature Validation**: Proves features work
- **User Testing**: Real-world usage patterns
- **Quality Assurance**: High-stakes use case

## Resources

### Official
- **Live Site**: https://specra.vercel.app
- **Repository**: https://github.com/dalmasonto/specra-docs

### Related
- **SDK**: https://github.com/dalmasonto/specra
- **CLI**: https://github.com/dalmasonto/specra-cli

### Tools
- **SvelteKit**: https://svelte.dev
- **Vercel**: https://vercel.com
- **MeiliSearch**: https://meilisearch.com

## Contact

**Authors**: dalmasonto, arthur-kamau
**License**: (Check repository for license)

---

This guide should help you understand, maintain, and extend specra-docs. Remember: this site is both documentation AND demonstration - any changes showcase Specra's capabilities!
