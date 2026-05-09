# VIBEMODO Stack Cleaner

Performance and Shopify Liquid audit tool for finding ghost code: external scripts left behind by uninstalled Shopify apps.

## What it does

- Scans rendered storefront HTML for external scripts.
- Cross-references scripts against installed app signatures.
- Highlights orphan scripts with estimated latency impact.
- Performs Safe Delete by backing up `layout/theme.liquid` before removal.
- Supports rollback from the latest backup snapshot.
- Ships with a Node worker, Dockerfile, Render persistent disk config, and GitHub Liquify Audit workflow.

## Local development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run build
npm run audit:liquify
node worker/liquid-worker.mjs
```

## Shopify configuration

Set these environment variables before connecting to a live Shopify store:

```bash
SHOPIFY_SHOP_DOMAIN=example.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxx
SHOPIFY_API_VERSION=2026-01
SHOPIFY_REQUIRED_SCOPES=read_themes,write_themes,read_apps
BACKUP_DIR=/data/backups
SCAN_RATE_LIMIT_MS=650
```

`write_themes` is required only for editing theme files. Scanning can run with read-only theme access.

## Deployment

The included `render.yaml` defines a Docker worker with a persistent disk mounted at `/data` for backup snapshots.

No billing action should be approved automatically. Create or change paid Render/GitHub resources only after explicit owner approval.
