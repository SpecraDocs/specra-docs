# Specra Docs - Gemini Developer Guide

## Overview
Welcome! This guide covers specra-docs, the official documentation website for Specra. This project is unique because it serves dual purposes: comprehensive documentation for Specra AND a production reference implementation built entirely with Specra.

## What is specra-docs?

### Primary Functions

1. **Documentation Hub**
   - Guides for getting started with Specra
   - API reference for all configuration options
   - Component documentation with examples
   - Best practices and patterns
   - Deployment guides

2. **Reference Implementation**
   - Real-world Specra site in production
   - Demonstrates all features and capabilities
   - Source code available for learning
   - Proves that Specra works at scale

3. **Onboarding Tool**
   - First touchpoint for new users
   - Converts visitors to users
   - Provides working examples
   - Reduces time-to-value

### The Meta Nature
```
┌──────────────────────────────────┐
│        specra-docs               │
│                                  │
│  A Specra documentation site     │
│  that documents how to build     │
│  Specra documentation sites      │
│                                  │
│  Built with: Specra              │
│  Documents: Specra               │
└──────────────────────────────────┘
```

This "dogfooding" approach:
- Validates Specra's capabilities
- Catches bugs in real-world usage
- Provides authentic examples
- Builds confidence in the product

## Ecosystem Position

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ specra-sdk  │────▶│ specra-docs │────▶│    User     │
│  (Product)  │     │   (Manual)  │     │  (Customer) │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                    │                     │
       │                    │                     │
       │                    ▼                     ▼
       │            ┌─────────────┐       ┌─────────────┐
       └────────────│create-specra│◀──────│ User's Site │
                    │    (CLI)    │       │   (Built)   │
                    └─────────────┘       └─────────────┘

Flow:
1. User discovers Specra via specra-docs
2. Learns features and capabilities
3. Uses create-specra to scaffold project
4. Refers back to specra-docs for guidance
5. Both user's site and specra-docs use specra-sdk
```

## Technical Architecture

### Technology Stack

```
Application Layer:
├── SvelteKit 16.1.0 (App Router)
│   ├── Server Components (default)
│   ├── Client Components (where needed)
│   └── Static Site Generation (SSG)
├── React 19.2.3
└── TypeScript 5.x

Documentation Framework:
└── Specra 0.1.7
    ├── MDX processing
    ├── Navigation generation
    ├── Theme system
    ├── Component library
    └── Search integration

Styling:
├── Tailwind CSS 4.1.9
│   └── Utility-first CSS framework
├── @tailwindcss/typography
│   └── Beautiful prose styling
└── PostCSS
    └── CSS processing

Search (Optional):
└── MeiliSearch
    ├── Full-text search
    ├── Instant results
    └── Typo-tolerant

Build & Deploy:
├── Vercel (hosting)
├── GitHub (version control)
├── tsx (TypeScript execution)
└── ESLint (code quality)
```

### Directory Structure

```
specra-docs/
│
├── app/                          # SvelteKit App Router
│   ├── layout.tsx                # Root layout (wraps specra)
│   ├── page.tsx                  # Landing/marketing page (8KB)
│   ├── globals.css               # Global styles + specra import
│   ├── not-found.tsx             # Custom 404 page
│   │
│   ├── docs/                     # Documentation routes
│   │   └── [version]/            # Dynamic version routing
│   │       └── [...slug]/        # Catch-all for doc pages
│   │           └── page.tsx      # Re-exports specra/app/docs-page
│   │
│   └── api/                      # API routes (if needed)
│       └── (potential endpoints)
│
├── docs/                         # Documentation content (MDX)
│   └── v1.0.0/                   # Version 1.0.0
│       │
│       ├── index.mdx             # Documentation homepage
│       │
│       ├── getting-started/      # Getting started guides
│       │   ├── introduction.mdx  # What is Specra
│       │   ├── installation.mdx  # How to install
│       │   ├── quick-start.mdx   # 5-minute start
│       │   └── first-steps.mdx   # Next steps
│       │
│       ├── configuration/        # Configuration docs
│       │   ├── overview.mdx      # Config overview
│       │   ├── site-config.mdx   # Site settings
│       │   ├── theme-config.mdx  # Theme options
│       │   ├── navigation.mdx    # Nav configuration
│       │   ├── search-config.mdx # Search setup
│       │   └── deployment.mdx    # Deployment options
│       │
│       ├── components/           # Component documentation
│       │   ├── overview.mdx      # Components overview
│       │   ├── callout.mdx       # Callout component
│       │   ├── code-block.mdx    # Code blocks
│       │   ├── tabs.mdx          # Tab component
│       │   ├── cards.mdx         # Card layouts
│       │   └── custom.mdx        # Custom components
│       │
│       ├── api/                  # API reference
│       │   ├── configuration.mdx # Config API
│       │   ├── components.mdx    # Component API
│       │   ├── utilities.mdx     # Utility functions
│       │   └── types.mdx         # TypeScript types
│       │
│       ├── guides/               # How-to guides
│       │   ├── versioning.mdx    # Multi-version docs
│       │   ├── customization.mdx # Customize Specra
│       │   ├── mdx-guide.mdx     # Writing MDX
│       │   ├── search.mdx        # Setting up search
│       │   ├── deployment.mdx    # Deploy your site
│       │   └── troubleshooting.mdx
│       │
│       └── examples/             # Example use cases
│           ├── basic-site.mdx
│           ├── api-docs.mdx
│           └── multi-version.mdx
│
├── public/                       # Static assets
│   ├── icon-light-32x32.png      # Light mode favicon
│   ├── icon-dark-32x32.png       # Dark mode favicon
│   ├── logo.svg                  # Site logo
│   ├── og-image.png              # Open Graph image
│   └── images/                   # Documentation images
│       ├── screenshots/
│       ├── diagrams/
│       └── examples/
│
├── scripts/                      # Build and utility scripts
│   ├── generate-redirects.mjs    # Generate URL redirects
│   ├── generate-static-redirects.mjs  # Static redirects
│   ├── index-search.ts           # Index docs in MeiliSearch
│   └── test-search.ts            # Test search functionality
│
├── specra.config.json            # Specra configuration (115 lines)
├── svelte.config.js               # SvelteKit config (minimal)
├── tailwind.config.ts            # Tailwind CSS config
├── postcss.config.mjs            # PostCSS configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies and scripts
├── redirects.json                # Generated redirects
├── README.md                     # Project documentation
└── UPDATED_STRUCTURE.md          # Structure documentation
```

### File Sizes and Complexity

| File | Size | Lines | Purpose |
|------|------|-------|---------|
| app/page.tsx | 8.4KB | ~250 | Landing page with hero, features |
| app/layout.tsx | 2KB | ~60 | Root layout wrapper |
| specra.config.json | 3.3KB | 115 | Complete Specra configuration |
| svelte.config.js | 46B | 1 | Re-exports specra config |
| package.json | 1.1KB | 35 | Dependencies and scripts |

**Key Takeaway**: Most files are tiny because Specra does the heavy lifting!

## Configuration Deep Dive

### Complete specra.config.json Breakdown

```json
{
  "$schema": "./node_modules/specra/config/specra.config.schema.json",

  // Site metadata
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

  // Theme configuration
  "theme": {
    "defaultMode": "system",            // light | dark | system
    "respectPrefersColorScheme": true   // Honor OS preference
  },

  // Navigation structure
  "navigation": {
    "showSidebar": true,
    "collapsibleSidebar": true,
    "showBreadcrumbs": true,
    "showTableOfContents": true,
    "tocPosition": "right",             // left | right
    "tocMaxDepth": 3,                   // Heading depth

    // Tab groups for organizing docs
    "tabGroups": [
      {
        "id": "guides",
        "label": "Guides",
        "icon": "book-open"             // Lucide icon name
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

  // Social media links
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
  },

  // Search configuration
  "search": {
    "enabled": false,                   // Currently disabled
    "placeholder": "Search documentation...",
    "provider": "meilisearch",
    "meilisearch": {
      "host": "http://localhost:7700",
      "apiKey": "aSampleMasterKey",
      "indexName": "docs"
    }
  },

  // Analytics (optional)
  "analytics": {
    "googleAnalytics": "",              // GA tracking ID
    "plausible": ""                     // Plausible domain
  },

  // Footer configuration
  "footer": {
    "copyright": "Copyright © 2026 Specra. All rights reserved.",

    // Footer link columns
    "links": [
      {
        "title": "Documentation",
        "items": [
          {
            "label": "Getting Started",
            "href": "/docs/v1.0.0/getting-started"
          },
          {
            "label": "API Reference",
            "href": "/docs/v1.0.0/api"
          }
        ]
      },
      {
        "title": "Community",
        "items": [
          {
            "label": "GitHub",
            "href": "https://github.com/dalmasonto/specra-docs"
          },
          {
            "label": "Discord",
            "href": "#"
          }
        ]
      }
    ],

    // Branding in footer
    "branding": {
      "showBranding": true,
      "logo": ""
    }
  }
}
```

### Configuration Patterns

#### Tab Groups
**Purpose**: Organize documentation into logical sections

```json
{
  "tabGroups": [
    { "id": "guides", "label": "Guides", "icon": "book-open" },
    { "id": "api", "label": "API", "icon": "zap" }
  ]
}
```

**Usage in MDX**:
```mdx
---
title: My Guide
tabGroup: guides
---
```

**Result**: Document appears under "Guides" tab.

#### Social Integration
**Purpose**: Connect users to community

```json
{
  "social": {
    "github": "url",      // GitHub icon in header
    "twitter": "url",     // Twitter icon
    "discord": "url",     // Discord icon
    "custom": [           // Custom links
      { "label": "Blog", "url": "url" }
    ]
  }
}
```

#### Footer Links
**Purpose**: Provide quick navigation in footer

```json
{
  "footer": {
    "links": [
      {
        "title": "Column Title",
        "items": [
          { "label": "Link Text", "href": "/path" }
        ]
      }
    ]
  }
}
```

**Result**: Multi-column footer with organized links.

## Content Structure

### MDX File Anatomy

```mdx
---
# Frontmatter (YAML)
title: Getting Started with Specra
description: Learn how to install and configure Specra
tabGroup: guides
order: 1
author: dalmasonto
lastUpdated: 2026-01-12
---

# Getting Started with Specra

Welcome to Specra! This guide will...

## Installation

You can install Specra using your favorite package manager:

import { Tabs, Tab } from 'specra/components'

<Tabs>
  <Tab title="npm">
    ```bash
    npm install specra
    ```
  </Tab>
  <Tab title="yarn">
    ```bash
    yarn add specra
    ```
  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm add specra
    ```
  </Tab>
</Tabs>

## Configuration

Create a `specra.config.json` file:

```json
{
  "site": {
    "title": "My Docs"
  }
}
```

import { Callout } from 'specra/components'

<Callout type="info">
  Make sure to place this file in your project root!
</Callout>

## Next Steps

- [Configuration Guide](/docs/v1.0.0/configuration/overview)
- [Component Reference](/docs/v1.0.0/components/overview)

---

**Feedback?** Open an issue on [GitHub](https://github.com/dalmasonto/specra/issues).
```

### Frontmatter Fields

| Field | Type | Purpose |
|-------|------|---------|
| `title` | string | Page title (required) |
| `description` | string | Meta description (required) |
| `tabGroup` | string | Which tab to show under |
| `order` | number | Sort order in sidebar |
| `author` | string | Content author |
| `lastUpdated` | date | Last update date |
| `draft` | boolean | Hide from production |

### Content Organization Strategy

```
docs/v1.0.0/
│
├── getting-started/    # Order: 1-10
│   ├── 01-intro.mdx
│   ├── 02-install.mdx
│   └── 03-start.mdx
│
├── configuration/      # Order: 11-20
│   ├── 11-overview.mdx
│   └── 12-options.mdx
│
├── components/         # Order: 21-30
│   ├── 21-overview.mdx
│   └── 22-callout.mdx
│
└── guides/            # Order: 31+
    └── 31-versioning.mdx
```

**Naming Convention**: `{order}-{slug}.mdx` for easy sorting.

## Key Application Files

### 1. app/layout.tsx
```typescript
import { ReactNode } from 'react'
// SvelteKit load functions handle metadata
import './globals.css'

// Import Specra's layout
import SpecraLayout from 'specra/app/layout'

export const metadata: Metadata = {
  title: 'Specra Docs',
  description: 'Modern documentation for SvelteKit',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  // Wrap in Specra's layout
  return <SpecraLayout>{children}</SpecraLayout>
}

// Re-export Specra's metadata generator
export { generateMetadata } from 'specra/app/layout'
```

**What This Does**:
- Imports Specra's root layout
- Adds global styles
- Wraps all pages with Specra's theme provider
- Handles metadata generation

### 2. app/page.tsx (Landing Page)
```typescript
import { goto } from '$app/navigation'
import { Button } from 'specra/components'
import { ArrowRight, Book, Zap, Layers } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">
            Modern Documentation for SvelteKit
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Build beautiful, searchable documentation sites with MDX,
            versioning, and more - out of the box.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/docs/v1.0.0/getting-started">
              <Button size="lg">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="https://github.com/dalmasonto/specra">
              <Button variant="outline" size="lg">
                View on GitHub
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything you need for great docs
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Book />}
            title="MDX Powered"
            description="Write docs in Markdown with React components"
          />
          <FeatureCard
            icon={<Zap />}
            title="Full-Text Search"
            description="Integrated MeiliSearch for instant results"
          />
          <FeatureCard
            icon={<Layers />}
            title="Multi-Version"
            description="Maintain multiple doc versions effortlessly"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-6">
          Ready to get started?
        </h2>
        <p className="text-xl mb-8">
          Create your documentation site in under a minute
        </p>
        <code className="bg-gray-100 dark:bg-gray-800 px-6 py-3 rounded-lg">
          npx create-specra my-docs
        </code>
      </section>
    </div>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-6 border rounded-lg">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  )
}
```

**What This Does**:
- Custom marketing/landing page
- Hero with CTA buttons
- Feature showcase
- Final CTA to get started
- Separate from documentation pages

### 3. app/docs/[version]/[...slug]/page.tsx
```typescript
// Minimal file - just re-exports!
export { default } from 'specra/app/docs-page'
export {
  generateStaticParams,
  generateMetadata,
} from 'specra/app/docs-page'
```

**What This Does**:
- Handles all `/docs/**` routes
- `[version]`: Matches version (e.g., v1.0.0)
- `[...slug]`: Catches everything else (e.g., getting-started/installation)
- Completely powered by Specra - zero custom code!

### 4. app/not-found.tsx
```typescript
import { goto } from '$app/navigation'
import { Button } from 'specra/components'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
        Page not found
      </p>
      <Link href="/">
        <Button>
          <Home className="mr-2 h-4 w-4" />
          Go Home
        </Button>
      </Link>
    </div>
  )
}
```

### 5. app/globals.css
```css
/* Import Tailwind base */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Import Specra's styles */
@import 'specra/styles';

/* Custom global styles */
:root {
  --custom-color: #0070f3;
}

.container {
  @apply max-w-7xl mx-auto px-4;
}

/* Custom prose styles */
.prose {
  @apply text-gray-900 dark:text-gray-100;
}
```

## Build Scripts

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "npm run generate:redirects && NEXT_BUILD_MODE=default vite build",
    "build:export": "npm run generate:redirects && NEXT_PUBLIC_BASE_PATH=/specra-docs NEXT_BUILD_MODE=export vite build && npm run generate:static-redirects",
    "start": "vite preview",
    "lint": "eslint .",
    "generate:redirects": "node scripts/generate-redirects.mjs",
    "generate:static-redirects": "node scripts/generate-static-redirects.mjs",
    "index:search": "tsx scripts/index-search.ts",
    "test:search": "tsx scripts/test-search.ts"
  }
}
```

### Script Purposes

#### Development
```bash
npm run dev
# Starts SvelteKit dev server
# Hot reload enabled
# Runs on http://localhost:3000
```

#### Production Build (Vercel)
```bash
npm run build
# 1. Generate redirects
# 2. Build with SSR enabled
# 3. Output to build/
# 4. Ready for Vercel deployment
```

#### Static Export (GitHub Pages)
```bash
npm run build:export
# 1. Generate redirects
# 2. Set base path for subdirectory
# 3. Build as static HTML
# 4. Generate static redirect files
# 5. Output to out/
```

#### Search Management
```bash
# Index documentation
npm run index:search
# → Scans docs/, pushes to MeiliSearch

# Test search
npm run test:search
# → Queries MeiliSearch, shows results
```

## Scripts Explained

### scripts/generate-redirects.mjs
**Purpose**: Create redirect rules for default routes

```javascript
import fs from 'fs'

const redirects = {
  // Redirect /docs to latest version
  '/docs': '/docs/v1.0.0',
  '/docs/': '/docs/v1.0.0/',

  // Redirect root doc paths to versioned paths
  '/getting-started': '/docs/v1.0.0/getting-started',
  '/configuration': '/docs/v1.0.0/configuration',
  // ... more redirects
}

// Write to redirects.json
fs.writeFileSync(
  'redirects.json',
  JSON.stringify(redirects, null, 2)
)

console.log('✓ Generated redirects.json')
```

### scripts/generate-static-redirects.mjs
**Purpose**: Create HTML redirect files for static hosting

```javascript
import fs from 'fs'
import path from 'path'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

const redirects = [
  { from: '/docs', to: '/docs/v1.0.0' },
  // ... more redirects
]

redirects.forEach(({ from, to }) => {
  const filePath = path.join('out', from, 'index.html')

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="0; url=${basePath}${to}">
    <link rel="canonical" href="${basePath}${to}">
    <title>Redirecting...</title>
  </head>
  <body>
    <p>Redirecting to <a href="${basePath}${to}">${to}</a></p>
  </body>
</html>
  `.trim()

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, html)
})

console.log('✓ Generated static redirects')
```

### scripts/index-search.ts
**Purpose**: Index documentation in MeiliSearch

```typescript
import { MeiliSearch } from 'meilisearch'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

// Initialize MeiliSearch client
const client = new MeiliSearch({
  host: 'http://localhost:7700',
  apiKey: 'aSampleMasterKey',
})

// Get all MDX files
const docsDir = path.join(process.cwd(), 'docs/v1.0.0')

function getAllMdxFiles(dir: string): string[] {
  const files: string[] = []

  function traverse(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        traverse(fullPath)
      } else if (entry.name.endsWith('.mdx')) {
        files.push(fullPath)
      }
    }
  }

  traverse(dir)
  return files
}

// Process files
const files = getAllMdxFiles(docsDir)
const documents = files.map((filePath, index) => {
  const content = fs.readFileSync(filePath, 'utf-8')
  const { data, content: body } = matter(content)

  // Convert file path to URL
  const relativePath = path.relative(docsDir, filePath)
  const url = `/docs/v1.0.0/${relativePath.replace(/\.mdx$/, '')}`

  return {
    id: index,
    title: data.title || 'Untitled',
    description: data.description || '',
    content: body.slice(0, 5000), // Limit content length
    url,
    tabGroup: data.tabGroup || 'guides',
  }
})

// Index documents
async function indexDocuments() {
  try {
    // Delete existing index (optional)
    await client.deleteIndex('docs').catch(() => {})

    // Create index
    const index = await client.createIndex('docs', {
      primaryKey: 'id',
    })

    // Add documents
    await index.addDocuments(documents)

    // Configure searchable attributes
    await index.updateSettings({
      searchableAttributes: ['title', 'description', 'content'],
      displayedAttributes: ['title', 'description', 'url', 'tabGroup'],
      filterableAttributes: ['tabGroup'],
    })

    console.log(`✓ Indexed ${documents.length} documents`)
  } catch (error) {
    console.error('Error indexing documents:', error)
  }
}

indexDocuments()
```

### scripts/test-search.ts
**Purpose**: Test search functionality

```typescript
import { MeiliSearch } from 'meilisearch'

const client = new MeiliSearch({
  host: 'http://localhost:7700',
  apiKey: 'aSampleMasterKey',
})

async function testSearch() {
  const queries = [
    'getting started',
    'configuration',
    'components',
    'installation',
  ]

  for (const query of queries) {
    console.log(`\nSearching for: "${query}"`)

    const results = await client.index('docs').search(query, {
      limit: 5,
      attributesToHighlight: ['title', 'content'],
    })

    console.log(`Found ${results.hits.length} results:`)
    results.hits.forEach((hit: any, index: number) => {
      console.log(`  ${index + 1}. ${hit.title}`)
      console.log(`     ${hit.url}`)
    })
  }
}

testSearch()
```

## Development Workflow

### Initial Setup

```bash
# Clone repository
git clone https://github.com/dalmasonto/specra-docs.git
cd specra-docs

# Install dependencies
npm install

# Start development
npm run dev

# Open browser
open http://localhost:3000
```

### Adding New Documentation

#### 1. Create File
```bash
# Create new guide
mkdir -p docs/v1.0.0/guides
touch docs/v1.0.0/guides/my-new-guide.mdx
```

#### 2. Add Content
```mdx
---
title: My New Guide
description: Learn how to do something awesome
tabGroup: guides
order: 50
---

# My New Guide

Content goes here...

## Prerequisites

Before starting, make sure you have...

## Step 1: Setup

First, you need to...

import { Callout } from 'specra/components'

<Callout type="tip">
  Pro tip: You can speed this up by...
</Callout>

## Step 2: Implementation

Now, let's implement...

```typescript
// Example code
const config = {
  // ...
}
```

## Next Steps

- [Related Guide](/docs/v1.0.0/guides/related)
- [API Reference](/docs/v1.0.0/api/reference)
```

#### 3. View Changes
- Save file
- SvelteKit hot-reloads automatically
- Navigate to URL: `/docs/v1.0.0/guides/my-new-guide`
- Appears in sidebar under "Guides" tab

### Editing Configuration

```bash
# Edit config
nano specra.config.json

# Changes apply immediately in dev mode
# Restart if needed: Ctrl+C, npm run dev
```

### Testing Locally

```bash
# Development mode
npm run dev

# Production build test
npm run build
npm start

# Check on http://localhost:3000
```

## Deployment

### Vercel (Current Deployment)

**Setup** (already done):
1. Connect GitHub repository to Vercel
2. Configure build settings:
   - Framework: SvelteKit
   - Build Command: `npm run build`
   - Output Directory: `build`
3. Add environment variables (if needed)
4. Deploy

**Automatic Deployment**:
- Push to `main` branch
- Vercel builds automatically
- Deploys to https://specra.vercel.app
- Preview deployments for PRs

**Manual Deployment**:
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### GitHub Pages (Alternative)

**Setup**:
1. Enable GitHub Pages in repository settings
2. Set source to `gh-pages` branch
3. Configure deployment workflow

**Build and Deploy**:
```bash
# Build static site
npm run build:export

# Output in out/

# Install gh-pages (first time)
npm install -g gh-pages

# Deploy
gh-pages -d out

# Available at: https://yourusername.github.io/specra-docs
```

**GitHub Actions** (automated):
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build:export

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./out
```

### Netlify

**Configuration**:
- Build command: `npm run build`
- Publish directory: `build`
- Node version: 18+

**Deploy Button**:
```markdown
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/dalmasonto/specra-docs)
```

## Search Integration

### Setting Up MeiliSearch

#### Option 1: Local Development

```bash
# Install MeiliSearch
curl -L https://install.meilisearch.com | sh

# Run
./meilisearch --master-key="aSampleMasterKey"

# Runs on http://localhost:7700
```

#### Option 2: Cloud (Meilisearch Cloud)

1. Sign up at https://www.meilisearch.com/cloud
2. Create index
3. Get API keys
4. Update specra.config.json:

```json
{
  "search": {
    "enabled": true,
    "meilisearch": {
      "host": "https://your-instance.meilisearch.io",
      "apiKey": "your-api-key",
      "indexName": "docs"
    }
  }
}
```

#### Option 3: Docker

```bash
docker run -d \
  -p 7700:7700 \
  -v $(pwd)/meili_data:/meili_data \
  getmeili/meilisearch:latest \
  meilisearch --master-key="aSampleMasterKey"
```

### Indexing Content

```bash
# Index all documentation
npm run index:search

# Output:
# ✓ Indexed 42 documents
```

### Testing Search

```bash
# Test search queries
npm run test:search

# Or use search UI in browser
open http://localhost:3000
# Press Cmd+K or Ctrl+K to open search
```

### Search UI

Once enabled, search appears as:
- Command palette (Cmd+K / Ctrl+K)
- Search icon in header
- Search bar in navigation

## Common Tasks

### Update Site Metadata

```json
// specra.config.json
{
  "site": {
    "title": "New Title",
    "description": "New description",
    "url": "https://new-url.com"
  }
}
```

### Add Social Link

```json
{
  "social": {
    "linkedin": "https://linkedin.com/in/yourprofile"
  }
}
```

### Customize Theme

```json
{
  "theme": {
    "defaultMode": "dark",  // Force dark mode
    "primaryColor": "#ff0000"  // Red accent color
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

Then in your MDX files:
```mdx
---
tabGroup: tutorials
---
```

### Add Footer Links

```json
{
  "footer": {
    "links": [
      {
        "title": "Resources",
        "items": [
          { "label": "Blog", "href": "/blog" },
          { "label": "Examples", "href": "/examples" }
        ]
      }
    ]
  }
}
```

## Troubleshooting

### Issue: Site won't build

**Check**:
- Syntax errors in MDX files
- Invalid YAML in frontmatter
- Missing required frontmatter fields
- Circular dependencies in imports

**Solution**:
```bash
# Check for errors
npm run lint

# Clear cache
rm -rf .svelte-kit build
npm run build
```

### Issue: Styles not applying

**Check**:
- `app/globals.css` imports `specra/styles`
- Tailwind configuration is correct
- No conflicting CSS

**Solution**:
```css
/* app/globals.css */
@import 'specra/styles';
```

### Issue: Search not working

**Check**:
- MeiliSearch is running
- `search.enabled: true` in config
- Content is indexed

**Solution**:
```bash
# Restart MeiliSearch
./meilisearch --master-key="aSampleMasterKey"

# Re-index
npm run index:search

# Test
npm run test:search
```

### Issue: Navigation not showing

**Check**:
- Files are in correct location (`docs/v1.0.0/`)
- Frontmatter is valid
- `tabGroup` matches configured groups

**Solution**:
```mdx
---
title: My Page
description: Description
tabGroup: guides
---
```

## Best Practices

### Documentation Writing
1. **Clear Structure**: Use headings logically (H1 → H2 → H3)
2. **Code Examples**: Provide working, copy-paste ready code
3. **Cross-Linking**: Link related pages liberally
4. **Visual Aids**: Include screenshots and diagrams
5. **Callouts**: Highlight important information

### Content Organization
1. **Logical Grouping**: Use tab groups effectively
2. **Progressive Disclosure**: Start simple, add complexity
3. **Consistent Naming**: Follow naming conventions
4. **Order Matters**: Use order field in frontmatter
5. **Avoid Duplication**: Link instead of repeat

### Performance
1. **Image Optimization**: Use SvelteKit Image component
2. **Code Splitting**: Large components in separate files
3. **Search Indexing**: Re-index after major updates
4. **Build Time**: Monitor and optimize if slow

### Maintenance
1. **Regular Updates**: Keep specra SDK updated
2. **Link Checking**: Verify links regularly
3. **Content Review**: Update outdated information
4. **Analytics**: Monitor popular pages
5. **User Feedback**: Act on user comments/issues

## Why This Project Matters

### For Users
- **Single Source of Truth**: Official documentation
- **Living Examples**: Real code to learn from
- **Up-to-Date**: Always reflects current SDK
- **Proven Patterns**: Best practices demonstrated

### For Specra Project
- **Validation**: Proves SDK works in production
- **Quality Assurance**: Catches bugs early
- **Marketing**: Showcases capabilities
- **Community**: Central hub for users

### For Developers
- **Reference Implementation**: Study real usage
- **Testing Ground**: Try features safely
- **Contribution**: Easy to contribute docs
- **Learning Resource**: Understand patterns

## Resources

### Live Site
- **Production**: https://specra.vercel.app
- **Status**: Check Vercel dashboard

### Repositories
- **This Project**: https://github.com/dalmasonto/specra-docs
- **SDK**: https://github.com/dalmasonto/specra
- **CLI**: https://github.com/dalmasonto/specra-cli

### Documentation
- **SvelteKit**: https://svelte.dev/docs
- **MDX**: https://mdxjs.com
- **MeiliSearch**: https://docs.meilisearch.com
- **Tailwind**: https://tailwindcss.com/docs

### Tools
- **Vercel**: https://vercel.com/docs
- **GitHub Pages**: https://pages.github.com

## Contact

**Authors**: dalmasonto, arthur-kamau
**Community**: Discord, GitHub Discussions
**Issues**: GitHub Issues
**License**: (Check repository)

---

This comprehensive guide should equip you to work effectively with specra-docs, understanding both its role in the Specra ecosystem and its technical implementation. Remember: this site is both product documentation AND product demonstration!
