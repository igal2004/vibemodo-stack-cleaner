# VIBEMODO Stack Cleaner QA Protocol

## Core safety checks

1. Run `npm run audit:liquify`.
2. Use a fixture that contains `{{ content_for_header }}` and `{{ content_for_layout }}`.
3. Trigger Safe Delete on an orphan script.
4. Confirm a backup snapshot is created before the script is removed.
5. Confirm protected Liquid markers remain in the edited theme.

## Edge case: shared CDN domains

Two installed apps can share a CDN host, including common domains such as Google Tag Manager or Shopify extension CDN paths. The scanner must never classify ownership by domain alone.

Expected behavior:
- Match by domain plus app-specific signatures, script path, query ID, or known snippet token.
- Mark a script as `review` when only the CDN domain matches.
- Block automatic deletion for shared-domain scripts unless an installed-app signature mismatch is explicit.

## Rollback safety test

1. Start with the seed `theme.liquid`.
2. Safe Delete `https://cdn.abandoned-cart-pro.com/recover.js`.
3. Verify the script no longer appears in the preview.
4. Click Rollback.
5. Verify the exact previous `theme.liquid` content is restored.
6. Confirm the rollback action consumes or archives the backup so repeated clicks cannot restore stale state unexpectedly.

## Shopify rate-limit test

Bulk theme inspections must use a throttled queue.

Expected behavior:
- Use `SCAN_RATE_LIMIT_MS` with a default of `650`.
- Inspect one theme asset at a time unless Shopify response headers allow more throughput.
- Back off on HTTP `429` and retry only after the `Retry-After` value.
- Prefer rendered HTML scan first, then inspect theme files only for scripts that need deletion evidence.

## Manual review gates

Do not auto-delete:
- Payment, checkout, consent, analytics governance, or fraud scripts.
- Scripts where the app match is based on shared CDN domain only.
- Inline scripts without a stable external `src`.
- Theme code inside `{% schema %}`, `{% javascript %}`, or merchant-authored sections.
