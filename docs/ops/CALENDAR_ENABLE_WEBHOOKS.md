## Enable Calendar Webhooks (Staging)

Date: 2026-01-02
Operator: Automated agent

## Objective

Enable calendar webhooks for allowlisted connections in staging, initially with signature validation mocked for test purposes.

## Procedure

1. Identify connection IDs for allowlisted providers (see `docs/ops/CALENDAR_IDENTIFY_PROVIDERS.md`).\n2. Update staging env:\n+\n+```\n+CALENDAR_WEBHOOK_ENABLED=true\n+CALENDAR_ALLOWLIST_CONNECTION_IDS=<connection_id_1>,<connection_id_2>\n+```\n+\n+3. Restart application if necessary.\n+4. Verify endpoint responds with 200 for allowlisted connection webhooks and 403 for non-allowlisted.\n+\n+## Notes\n+\n+- Signature validation is mocked in `src/app/api/webhooks/calendar/google/route.ts`; validate behavior accordingly.\n+\n*** End Patch
