export function GET() {
  const content = `# Specra

> Specra is a modern, open-source documentation framework built on Next.js. It helps developers and teams create beautiful, fast, and feature-rich documentation sites with minimal configuration.

## What is Specra?

Specra is a documentation platform consisting of three packages:

- **specra** (the SDK): A Next.js-based library providing layouts, components, MDX rendering, versioning, i18n, search, and theming out of the box.
- **create-specra** (the CLI): A scaffolding tool that generates a new Specra documentation project in seconds.
- **specra-docs**: The official documentation site for Specra, built with Specra itself (dogfooding).

Specra is designed for developer teams, open-source projects, and SaaS products that need professional documentation with features like multi-version support, internationalization, and API reference generation.

## specra (SDK)

The core library installed as a dependency. It provides:

- MDX content rendering with syntax highlighting, math (KaTeX), and Mermaid diagrams
- Multi-version documentation (e.g. v1.0.0, v2.0.0)
- Internationalization (i18n) with locale-specific content files
- Tab group navigation (e.g. Guides, API Reference, Components)
- Dark/light/system theme support
- Table of contents, breadcrumbs, sidebar navigation
- Full-text search via MeiliSearch integration
- Built-in UI components for documentation (see Components below)
- Configurable via a single specra.config.json file

## create-specra (CLI)

The scaffolding CLI tool. Usage:

\`\`\`bash
npx create-specra my-docs
# or
yarn create specra my-docs
\`\`\`

Generates a ready-to-use Specra project with example content, configuration, and deployment scripts.

## Documentation Structure

The documentation is organized into the following sections:

### Guides
- [Getting Started](/docs/v1.0.0/getting-started) - Quick start guide for new users
- [Writing Content](/docs/v1.0.0/writing-content) - How to author MDX documentation
- [Features](/docs/v1.0.0/features) - Overview of Specra features
- [Customization](/docs/v1.0.0/customization) - Theming and layout customization
- [Tab Groups](/docs/v1.0.0/tab-groups) - Organizing navigation with tab groups
- [Search Setup](/docs/v1.0.0/search-setup) - Configuring MeiliSearch
- [Performance](/docs/v1.0.0/performance) - Performance optimization tips
- [About](/docs/v1.0.0/about) - About the Specra project
- [create-specra](/docs/v1.0.0/create-specra) - CLI tool documentation

### API Reference
- [API Overview](/docs/v1.0.0/api/api-overview) - Introduction to API documentation features
- [API Formats](/docs/v1.0.0/api/api-formats) - Supported API documentation formats
- [OpenAPI](/docs/v1.0.0/api/api-openapi) - OpenAPI/Swagger integration
- [Postman](/docs/v1.0.0/api/api-postman) - Postman collection support
- [Manual Components](/docs/v1.0.0/api/api-manual-components) - Hand-crafted API docs components
- [Specra Test](/docs/v1.0.0/api/api-specra-test) - API testing utilities

### Components
- [Overview](/docs/v1.0.0/components) - All available components
- [Accordion](/docs/v1.0.0/components/accordion) - Collapsible content sections
- [Badge](/docs/v1.0.0/components/badge) - Status and label badges
- [Callout](/docs/v1.0.0/components/callout) - Info, warning, and error callouts
- [Card](/docs/v1.0.0/components/card) - Content cards
- [Code Block](/docs/v1.0.0/components/code-block) - Syntax-highlighted code blocks
- [Columns](/docs/v1.0.0/components/columns) - Multi-column layouts
- [Frame](/docs/v1.0.0/components/frame) - Content framing
- [Icon](/docs/v1.0.0/components/icon) - Icon components
- [Image](/docs/v1.0.0/components/image) - Optimized images
- [Image Card](/docs/v1.0.0/components/image-card) - Cards with images
- [Math](/docs/v1.0.0/components/math) - KaTeX math rendering
- [Mermaid](/docs/v1.0.0/components/mermaid) - Mermaid diagram rendering
- [Steps](/docs/v1.0.0/components/steps) - Step-by-step instructions
- [Tabs](/docs/v1.0.0/components/tabs) - Tabbed content panels
- [Tailwind CSS](/docs/v1.0.0/components/tailwind-css) - Tailwind CSS utilities
- [Tooltip](/docs/v1.0.0/components/tooltip) - Hover tooltips
- [Video](/docs/v1.0.0/components/video) - Video embedding

### Configuration
- [Overview](/docs/v1.0.0/configuration/overview) - Configuration file reference
- [Site Config](/docs/v1.0.0/configuration/site-config) - Site-level settings
- [Navigation](/docs/v1.0.0/configuration/navigation) - Navigation configuration
- [Deployment Config](/docs/v1.0.0/configuration/deployment-config) - Deployment target settings
- [Advanced](/docs/v1.0.0/configuration/advanced) - Advanced configuration options

### Deployment
- [Overview](/docs/v1.0.0/deployment/overview) - Deployment options overview
- [Vercel](/docs/v1.0.0/deployment/vercel) - Deploy to Vercel
- [Netlify](/docs/v1.0.0/deployment/netlify) - Deploy to Netlify
- [GitHub Pages](/docs/v1.0.0/deployment/github-pages) - Deploy to GitHub Pages

## Key Links

- Website: https://specra-docs.com
- GitHub: https://github.com/SpecraDocs/specra-docs
- Discord: https://discord.com/invite/SpecraDocs
- Twitter: https://twitter.com/SpecraDocs
- Pricing: /pricing

## Technology Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- MDX
- MeiliSearch (optional)

## Internationalization

Documentation is available in:
- English (en) - default
- Deutsch (de)
- Español (es)
- Français (fr)
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
