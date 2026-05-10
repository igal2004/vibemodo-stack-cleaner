# Shopify App Configuration

## Current status

- Status: **Blocked / Not Render-aligned**
- This app has a Render-aligned Shopify CLI template at `shopify.app.render.example.toml`.
- This app does **not** yet have a verified active `shopify.app.render.toml` with a Stack Cleaner Partner app client ID.
- No Shopify API key, app secret, access token, session token, or OAuth credential is committed.

## Partner app fields

Expected values for the Stack Cleaner Render test app:

| Field | Expected value |
|---|---|
| App name | `VIBEMODO Stack Cleaner` |
| App URL | `https://vibemodo-stack-cleaner.onrender.com` |
| Embedded app | Enabled |
| Allowed redirection URL | `https://vibemodo-stack-cleaner.onrender.com/auth/callback` |
| Privacy policy URL | `https://vibemodo-stack-cleaner.onrender.com/privacy` |
| App uninstall webhook | `https://vibemodo-stack-cleaner.onrender.com/webhooks/app/uninstalled` |
| Customer data request webhook | `https://vibemodo-stack-cleaner.onrender.com/webhooks/customers/data_request` |
| Customer redact webhook | `https://vibemodo-stack-cleaner.onrender.com/webhooks/customers/redact` |
| Shop redact webhook | `https://vibemodo-stack-cleaner.onrender.com/webhooks/shop/redact` |

## Environment variables

Use environment variables only:

```text
SHOPIFY_APP_URL
RENDER_APP_URL
SHOPIFY_API_KEY
SHOPIFY_API_SECRET
SHOPIFY_SCOPES
SHOPIFY_REQUIRED_SCOPES
SHOPIFY_DEV_STORE_DOMAIN
DEV_STORE_DOMAIN
SHOPIFY_SHOP_DOMAIN
SHOPIFY_ADMIN_ACCESS_TOKEN
SHOPIFY_THEME_ID
STOREFRONT_URL
INSTALLED_APP_SIGNATURES_JSON
```

`SHOPIFY_API_KEY` is public in Shopify app config, but it should still be treated as configuration and not scattered through docs or UI. `SHOPIFY_API_SECRET`, Admin access tokens, OAuth session tokens, and external provider secrets must never be committed or logged.

## Runtime notes

- The current backend exposes `/api/config`, `/api/scan`, and `/api/remediate`.
- `/auth` and `/auth/callback` routes are present; callback validates Shopify HMAC and OAuth state before token exchange.
- Offline session persistence is implemented with `DATABASE_URL` Postgres storage and an explicitly local-only memory fallback.
- Dev-store install/open remains blocked until Render service, Partner app config, and database-backed session storage are active and verified.
- Privacy and uninstall webhook routes are present and HMAC-gated.
- `/api/scan` fails with HTTP `428` when required Shopify configuration is missing.
- `/api/remediate` stages a remediation task only and does not mutate Shopify.
- Full OAuth session persistence is not yet evidenced against the dev store; wet-test status remains blocked until Render deployment and Partner URL parity are verified.
