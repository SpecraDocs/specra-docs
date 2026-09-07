# Local MeiliSearch

This folder holds a local [MeiliSearch](https://www.meilisearch.com/) server used to power documentation search during development.

The binary and its data are **not** committed to git (they're large and machine-specific — see `.gitignore`). Only this README is tracked. Run `npm run search:install` on a fresh clone to download the binary.

## Contents

| File | Tracked? | What it is |
|------|----------|------------|
| `meilisearch` | no | The MeiliSearch server binary (downloaded) |
| `data.ms/` | no | The on-disk search index (created on first run) |
| `README.md` | yes | This file |

## Quick start

From the `specra-docs` project root:

```bash
# 1. Download the MeiliSearch binary into this folder (only needed once)
npm run search:install

# 2. Start the server (keep this running in its own terminal)
npm run search:serve

# 3. In another terminal: index your docs, then run the app
npm run index:search
npm run dev
```

Open the app and press **⌘K** / **Ctrl+K** to search.

## How it works

`npm run search:serve` runs:

```bash
./meilisearch/meilisearch \
  --master-key=aSampleMasterKey \
  --http-addr=127.0.0.1:7700 \
  --db-path=./meilisearch/data.ms \
  --env=development
```

- **`--master-key=aSampleMasterKey`** — this must match `search.meilisearch.apiKey` in
  `specra.config.json`. The same key is used to index (`npm run index:search`) and to
  query (the server-side `/api/search` route), so keep the two in sync. Change both if
  you want a different key.
- **`--http-addr=127.0.0.1:7700`** — the server listens on `http://localhost:7700`,
  which is the `search.meilisearch.host` in `specra.config.json`.
- **`--db-path=./meilisearch/data.ms`** — the index is stored here (relative to the
  `specra-docs` root, since npm scripts run from there). Delete this folder to reset the
  index.
- **`--env=development`** — enables the local dashboard/analytics defaults. Use
  `--env=production` (which requires a strong master key) for real deployments.

Check it's up:

```bash
curl http://localhost:7700/health
# {"status":"available"}
```

## Notes

- The browser never talks to this server directly. The app's server-side `/api/search`
  route reads the key from `specra.config.json` and forwards queries, so the key stays on
  the server.
- Re-run `npm run index:search` whenever your docs change.
- This setup is for **local development**. In production, host MeiliSearch separately
  (MeiliSearch Cloud, a VPS, etc.) and point `search.meilisearch.host` at it with a
  search-only key. See the [Search Setup guide](../docs/v1.0.0/search-setup.en.mdx).
