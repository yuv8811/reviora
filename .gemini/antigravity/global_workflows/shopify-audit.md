You have the Shopify Dev MCP connected. Treat it as the source of truth for
every Shopify-specific decision. Do not rely on memory, because APIs,
scopes and App Store requirements change often.

STEP 0 - UNDERSTAND THE APP (read-only)
Before judging anything, inspect the repo and summarize:
- What the app does, its stack, and its structure (shopify.app.toml,
  /app, /extensions, prisma/DB, webhooks, billing code)
- Which Shopify surfaces it uses: embedded admin, theme app extension,
  checkout/Functions, POS, Storefront API, etc.
Use this summary to decide which checks below apply. Skip the ones that
don't, and say what you skipped.

PHASE 1 - AUDIT (no code changes)
1. API versions: use the MCP to find the latest stable Admin API version.
   Check shopify.app.toml, API clients and webhook subscriptions.
2. GraphQL: validate every query and mutation with the MCP's validation
   tools. Flag deprecated fields, REST calls that should be GraphQL, and
   missing pagination, rate-limit or error handling.
3. App Store requirements:
   - Embedded auth uses session tokens / token exchange
   - Mandatory compliance webhooks (customers/data_request,
     customers/redact, shop/redact) are implemented with HMAC verification
   - app/uninstalled handling and data cleanup
   - Scopes are minimal, used, and declared in shopify.app.toml
   - Billing uses the Shopify Billing API with correct plan/trial handling
   - Storefront features use theme app extensions or app embed blocks,
     not ScriptTag or direct theme file edits
4. UI: check against current Polaris / App Bridge guidance, validating
   components via the MCP. Flag custom UI that duplicates Polaris.
5. Built for Shopify criteria: admin load speed, storefront performance
   impact, error states, onboarding, accessibility.
6. Security: HMAC checks, no secrets in client code, input validation,
   safe handling of customer data, least-privilege access.
7. Extensions: audit everything under /extensions (config, versions,
   target placement, performance).

Output a prioritized report: Critical (App Store rejection risk),
Important, Nice-to-have. For every finding give the file path, the problem,
the fix, and the Shopify doc page that backs it.

STOP after the report and wait for my approval.

PHASE 2 - FIX (only after approval)
Fix Critical first, then Important. For each change: explain why, validate
new GraphQL/components through the MCP, keep changes small and focused,
and do not touch unrelated code. When done, re-run the audit checks and
report what remains.