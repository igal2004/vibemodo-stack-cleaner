# Dev Store Wet Test

## Status

- Current status: **Blocked / Render alignment pending**
- Reason: this repository does not yet have verified live Render service evidence, active `shopify.app.render.toml`, or Shopify Partner Dashboard parity proof for Stack Cleaner.
- Completion rule: do not mark Shopify runtime behavior complete until the app is installed, opened, and scanned in the VIBEMODO development store through the Render URL.

## Dev store target

- Dev store name/reference: `vibemodo-seo-test`
- Dev store domain: `vibemodo-seo-test.myshopify.com`
- Source of reference: existing VIBEMODO SEO Manager repo docs and Shopify config.

## Render target

- Render web service name: `vibemodo-stack-cleaner`
- Render worker service name: not required for the current synchronous read-only scan implementation.
- Expected Render app URL: `https://vibemodo-stack-cleaner.onrender.com`
- Current live evidence: **blocked**. `curl -I https://vibemodo-stack-cleaner.onrender.com` returned Render routing `404` / `x-render-routing: no-server` on 2026-05-09.

## Shopify Partner URL parity checklist

All of these must use the same Render HTTPS base URL:

- `SHOPIFY_APP_URL`: `https://vibemodo-stack-cleaner.onrender.com`
- Partner App URL: `https://vibemodo-stack-cleaner.onrender.com`
- Embedded App URL: `https://vibemodo-stack-cleaner.onrender.com`
- Allowed redirection URL: `https://vibemodo-stack-cleaner.onrender.com/auth/callback`
- App uninstall webhook URL: `https://vibemodo-stack-cleaner.onrender.com/webhooks/app/uninstalled`
- Privacy webhook URLs:
  - `https://vibemodo-stack-cleaner.onrender.com/webhooks/customers/data_request`
  - `https://vibemodo-stack-cleaner.onrender.com/webhooks/customers/redact`
  - `https://vibemodo-stack-cleaner.onrender.com/webhooks/shop/redact`

## Required scopes

```text
read_themes,read_apps
```

`write_themes` is intentionally not part of the baseline wet-test install. Any future apply-fix flow must require backup, diff preview, merchant approval, audit log, and rollback before adding write scope.

## Wet-test gates

| Gate | Status | Evidence |
|---|---|---|
| Render URL reachable | Blocked | Expected URL returned Render no-server routing on 2026-05-09 |
| `SHOPIFY_APP_URL` Render parity | Render alignment pending | `.env.example`, `render.yaml`, and `shopify.app.render.example.toml` document the intended Render URL |
| Partner Dashboard App URL parity | Blocked | No Partner Dashboard evidence available in repo |
| OAuth callback parity | Render alignment pending | `shopify.app.render.example.toml` includes the Render callback |
| Dev-store install | Blocked | Cannot pass until Render service, Partner app config, and OAuth session persistence are active |
| Embedded open in Shopify Admin | Blocked | Requires install on `vibemodo-seo-test.myshopify.com` |
| Settings page reachable | Blocked | Requires embedded app open proof |
| First read-only scan | Blocked | Requires configured Shopify credentials and installed app context |
| Preview/fix/log governed flow | Blocked | Remediation endpoint stages only; no mutation approval gate is implemented |

## Commands

```bash
npm run verify:render-alignment
npm run wet-test:status
curl -I https://vibemodo-stack-cleaner.onrender.com
```

Do not use Railway or ngrok for this app's Shopify wet-test target unless a newer approved repo document explicitly supersedes the Render path.
