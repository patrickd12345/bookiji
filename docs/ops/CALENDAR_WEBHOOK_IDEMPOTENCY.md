## Webhook Idempotency Verification

Date: 2026-01-02
Operator: Automated agent

## Objective

Verify webhooks are idempotent through `webhook_dedupe_keys` stored on `external_calendar_connections`.

## Steps

1. Send a webhook payload with a dedupe key (e.g., header `X-Goog-Resource-ID` or `body.id`).\n2. Verify `webhook_dedupe_keys` array contains the dedupe key:\n+\n+```sql\n+SELECT webhook_dedupe_keys FROM external_calendar_connections WHERE id = '<connection_id>';\n+```\n+\n+3. Send the same webhook again; verify endpoint returns processed duplicate (200 with duplicate reason) and no additional side effects.\n+4. Send 101 unique webhook notifications and verify `webhook_dedupe_keys` trimmed to last 100 entries.\n\n## Notes\n\n- The system stores dedupe keys as JSONB array and trims to last 100 keys to bound growth.\n\n*** End Patch
