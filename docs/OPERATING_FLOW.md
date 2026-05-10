# Operating Flow

## Current runtime status

- Local implementation status: verified.
- Shopify runtime status: **Blocked / Not Render-aligned**.
- Dev-store wet-test status: **Blocked** until Render service, Partner Dashboard parity, install, embedded open, and first read-only scan are verified.

## Safe scan flow

1. Merchant opens the embedded app in Shopify Admin.
2. App loads Polaris UI and App Bridge script context.
3. App calls `/api/config`.
4. If required configuration is missing, the app shows a clear blocked state and does not invent data.
5. App checks `/api/install/status` for an OAuth offline session.
6. Merchant runs a read-only scan.
7. Backend calls Shopify Admin GraphQL and storefront HTML only when configured and installed.
8. Audit Trail records each scan step and data source.
9. Script findings remain `unattributed` unless a real installed-app signature inventory supports attribution.

## Remediation flow

Current behavior:

```text
Scan -> Detect -> Stage remediation only -> Mutation blocked
```

Future governed behavior before enabling writes:

```text
Scan -> Detect -> Preview -> Suggest Fix -> Merchant Approval -> Apply Fix -> Audit Log -> Re-scan / Verify
```

## Approval gates

The app must not perform these actions without explicit approval gates:

- Theme file mutation.
- Auto-fix.
- Billing action.
- Paid plan/add-on selection.
- External OAuth connection that grants new data access.
- Webhook or Partner Dashboard changes outside the documented Render target.

## Completion labels

- Local only: local implementation verified, no Shopify runtime proof.
- Render alignment pending: Render URL and Partner URL parity are not verified.
- Wet-test pending: Render parity is verified, but dev-store install/open/scan proof is not complete.
- Wet-test passed: installed and opened from `vibemodo-seo-test.myshopify.com` using the Render URL and read-only scan verified.
- Blocked: exact missing dependency or mismatch is documented.
