# VIBEMODO Stack Cleaner QA Protocol

## Configuration honesty

1. Start the app with no `.env`.
2. Open `/api/config`.
3. Confirm missing variables are listed without exposing secrets.
4. Call `POST /api/scan`.
5. Confirm HTTP `428` and a clear message such as `Missing required Shopify configuration`.
6. Confirm the Polaris UI shows "not configured" and does not render fake scripts.

## Real Shopify scan

1. Configure `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, `SHOPIFY_API_KEY`, and `SHOPIFY_API_SECRET`.
2. Grant only the minimum read scopes first: `read_themes,read_apps`.
3. Run `POST /api/scan`.
4. Confirm Audit Trail includes:
   - configuration validation
   - Shopify Admin GraphQL shop context
   - storefront HTML fetch URL
   - theme file scan result or exact missing `SHOPIFY_THEME_ID` requirement
5. Confirm no script is labeled orphan unless a real installed-app signature inventory is configured.

## Shared CDN edge case

Two apps can share a CDN domain, including Google Tag Manager or Shopify extension CDN paths.

Expected behavior:
- Never classify ownership by domain alone.
- Require domain plus configured signature token.
- Mark unmatched scripts as `unattributed`, not automatically orphaned.
- Keep remediation as "review only" unless the script is present in a specific theme file.

## Theme file safety

1. Set `SHOPIFY_THEME_ID` to a real theme GID.
2. Confirm the backend uses GraphQL `theme(id).files` for `layout/theme.liquid`.
3. Confirm `read_themes` failures are surfaced as missing requirement text.
4. Confirm `POST /api/remediate` stages only and does not call a mutation.

## Rollback and mutation gate

Rollback is not enabled because mutations are not enabled. Before production mutation support:
- Create a backup snapshot before any write.
- Show a Liquid diff preview.
- Require explicit merchant approval.
- Record mutation actor, file, checksum, and rollback ID.
- Add a tested restore path before enabling `write_themes`.

## Rate limits

Expected behavior:
- Use low-cost GraphQL reads.
- Avoid bulk theme traversal by default.
- Inspect storefront HTML first.
- Inspect `layout/theme.liquid` only when `SHOPIFY_THEME_ID` is configured.
- Surface GraphQL throttle or scope errors exactly in Audit Trail.

## App Store readiness

Checklist:
- Polaris-native UI.
- App Bridge meta/script present.
- No fake reviews, installs, billing events, merchant activity, or recommendation claims.
- Privacy-safe Audit Trail with no access token logging.
- No paid action or billing commitment without explicit approval.
