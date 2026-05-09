# Render Deployment

## Current status

- Status: **Blocked / Render alignment pending**
- Expected web service: `vibemodo-stack-cleaner`
- Expected app URL: `https://vibemodo-stack-cleaner.onrender.com`
- Worker service: not required for the current read-only scan architecture.
- Database/Redis: not required until OAuth session persistence, background jobs, or approval-gated mutations are added.

## Evidence

- `render.yaml` exists and defines a Docker web service.
- `SHOPIFY_APP_URL` and `RENDER_APP_URL` are environment variables, not hardcoded secrets.
- On 2026-05-09, `curl -I https://vibemodo-stack-cleaner.onrender.com` returned `HTTP/2 404` with `x-render-routing: no-server`, so a live Render service is not verified.

## Required Render env

```text
SHOPIFY_APP_URL=https://vibemodo-stack-cleaner.onrender.com
RENDER_APP_URL=https://vibemodo-stack-cleaner.onrender.com
SHOPIFY_API_KEY=<from Shopify Partner app>
SHOPIFY_API_SECRET=<secret, Render env only>
SHOPIFY_DEV_STORE_DOMAIN=vibemodo-seo-test.myshopify.com
DEV_STORE_DOMAIN=vibemodo-seo-test.myshopify.com
SHOPIFY_SCOPES=read_themes,read_apps
SHOPIFY_REQUIRED_SCOPES=read_themes,read_apps
SHOPIFY_SHOP_DOMAIN=vibemodo-seo-test.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=<secret, Render env only>
SHOPIFY_THEME_ID=<dev store theme gid>
STOREFRONT_URL=https://vibemodo-seo-test.myshopify.com
INSTALLED_APP_SIGNATURES_JSON=<non-secret signature map or managed config>
```

## Health check

- Render health check path: `/api/config`
- Expected configured response: `configured: true`
- Expected unconfigured response: HTTP `200` with `configured: false` and missing variable names.

## Deployment rule

Do not use Railway, ngrok, localhost, or temporary tunnels for Shopify wet tests on this app unless a newer approved repo document supersedes this Render deployment path.
