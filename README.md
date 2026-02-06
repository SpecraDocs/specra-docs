# Specra Documentation Site

**Specra** is a modern documentation framework built on Next.js that makes it easy to create beautiful, fast, and searchable documentation sites. With built-in support for MDX, versioning, API documentation generation, and customizable themes, Specra helps you focus on writing great docs.

The docs can be found here https://specra.vercel.app/

## Quick Start

### Create a New Documentation Site

The fastest way to get started is with `create-specra`:

```bash
npx create-specra@latest my-docs
cd my-docs
npm install
npm run dev
```

This will scaffold a complete documentation site with:
- Pre-configured Next.js setup
- Sample documentation structure
- Ready-to-use UI components
- Version management
- Search functionality
- Responsive design

Open [http://localhost:3000](http://localhost:3000) to see your documentation site running locally.

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
├── app/              # Next.js app directory
│   ├── layout.tsx    # Root layout
│   ├── page.tsx      # Home page
│   └── docs/         # Documentation pages
├── components/       # Reusable components
│   ├── docs/        # Documentation-specific components
│   └── ui/          # UI components
├── docs/            # Your MDX documentation files
│   └── v1.0.0/     # Version 1.0.0 docs
├── lib/             # Utility functions
│   ├── mdx.ts      # MDX processing
│   ├── config.ts   # Configuration
│   └── parsers/    # API parsers
├── public/          # Static assets
└── specra.config.json  # Specra configuration
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

Import and use components in your MDX:

```mdx
import { Callout } from '@/components/docs/callout'
import { CodeBlock } from '@/components/docs/code-block'
import { Tabs, Tab } from '@/components/docs/tabs'

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
npm run start
```

## Learn More

- [Specra Documentation](https://specra.dev/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [MDX Documentation](https://mdxjs.com)

## Deployment

Deploy your Specra documentation site to Vercel, Netlify, GitHub Pages, or any hosting platform that supports Next.js/static pages.

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

### GitHub Pages (Static Export)

To deploy as a static site to GitHub Pages:

1. Update your `specra.config.json`:

```json
{
  "deployment": {
    "target": "github",
    "basePath": "/your-repo-name",
    "customDomain": false
  }
}
```

**Note on `basePath`:**
- **With custom domain** (`docs.yoursite.com`): Set `customDomain: true` and leave `basePath` empty (`""`)
- **Without custom domain** (`yourusername.github.io/repo-name`): Set `basePath` to your repo name (`"/your-repo-name"`)

2. Build and export your site:

```bash
npm run build:export
```

3. Deploy the `out` directory to GitHub Pages:

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Push to GitHub
git remote add origin https://github.com/yourusername/your-repo-name.git
git branch -M main
git push -u origin main

# Deploy to gh-pages branch
npm install -g gh-pages
gh-pages -d out
```

4. Enable GitHub Pages in your repository settings:
   - Go to Settings > Pages
   - Select `gh-pages` branch as the source
   - Your site will be available at `https://yourusername.github.io/your-repo-name`

Alternatively, use GitHub Actions for automatic deployment. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build:export

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./out
```

### Manual Server Deployment (SCP)

If you prefer to deploy the static export to your own server manually:

1. Build the static export:

```bash
npm run build:export
```

2. Zip the output directory:

```bash
zip -r out.zip out/
```

3. Copy the zip to your server:

```bash
scp out.zip user@your-server:/path/to/destination/
```

4. SSH into the server and extract:

```bash
ssh user@your-server
cd /path/to/destination
unzip -o out.zip # or unzip -o out.zip -d specra
```

You can combine steps 2-3 into a single command:

```bash
zip -r out.zip out/ && scp out.zip user@your-server:/path/to/destination/
```

## Need Help?

- Check the [documentation](https://specra.dev/docs)
- Report issues on [GitHub](https://github.com/yourusername/specra/issues)
