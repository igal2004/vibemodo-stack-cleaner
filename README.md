# VIBEMODO Stack Cleaner

Embedded Shopify app for read-only storefront script audits. The app is built to fail honestly when Shopify credentials or scopes are missing.

## Architecture

- React + Vite frontend
- Shopify Polaris UI
- App Bridge meta/script setup in `index.html`
- Express backend
- Shopify Admin GraphQL API reads through `/api/scan`
- No store mutations, billing actions, or auto-fixes without an explicit approval gate

## Required environment

Copy `.env.example` to `.env` and configure real values:

```bash
SHOPIFY_API_KEY=your_partner_app_api_key
SHOPIFY_API_SECRET=your_partner_app_api_secret
SHOPIFY_APP_URL=https://vibemodo-stack-cleaner.onrender.com
RENDER_APP_URL=https://vibemodo-stack-cleaner.onrender.com
SHOPIFY_DEV_STORE_DOMAIN=vibemodo-seo-test.myshopify.com
SHOPIFY_SHOP_DOMAIN=example.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxx
SHOPIFY_API_VERSION=2026-01
SHOPIFY_SCOPES=read_themes,read_apps
SHOPIFY_REQUIRED_SCOPES=read_themes,read_apps
SHOPIFY_THEME_ID=gid://shopify/OnlineStoreTheme/000000000
STOREFRONT_URL=https://example.myshopify.com
INSTALLED_APP_SIGNATURES_JSON=[{"name":"Example App","domains":["cdn.example-app.com"],"signatures":["example-app"]}]
```

`SHOPIFY_THEME_ID` is optional for basic storefront HTML scans, but required to inspect `layout/theme.liquid` through GraphQL `theme(id).files`.

## API

- `GET /api/config`: returns safe configuration status with no secrets.
- `POST /api/scan`: performs read-only Shopify Admin GraphQL and storefront HTML scan. Returns `428` when required config is missing.
- `POST /api/remediate`: stages a remediation task only. It does not mutate Shopify theme files.

## Local development

```bash
npm install
npm run dev:server
npm run dev
```

For production-style local verification:

```bash
npm run build
npm run start:local
```

Then open `http://127.0.0.1:5183`.

## Verification

```bash
npm run lint
npm run build
npm run audit:liquify
npm run verify:render-alignment
```

## Deployment

`render.yaml` defines a Docker web service and persistent disk for future backup snapshots. Do not enable paid plans, disks, add-ons, or billing commitments without explicit owner approval.

## Dev-store / Render wet-test gate

This app must use the VIBEMODO Render path before Shopify runtime work is marked complete.

- Dev store: `vibemodo-seo-test.myshopify.com`
- Expected Render URL: `https://vibemodo-stack-cleaner.onrender.com`
- Current status: `Render alignment pending` / wet-test blocked until Render service, Partner Dashboard URL parity, install/open, and first read-only scan are verified.

See `docs/DEV_STORE_WET_TEST.md`, `docs/SHOPIFY_APP_CONFIGURATION.md`, `docs/RENDER_DEPLOYMENT.md`, `docs/OPERATING_FLOW.md`, and `docs/PROGRESS_STATUS.md`.
