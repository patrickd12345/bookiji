## Enable Inbound Calendar Sync (Staging)

Date: 2026-01-02
Operator: Automated agent

## Objective

Enable inbound free/busy calendar sync in staging by turning on `CALENDAR_SYNC_ENABLED` and `CALENDAR_JOBS_ENABLED` for allowlisted providers.

## Procedure

1. Ensure `CALENDAR_ALLOWLIST_PROVIDER_IDS` contains selected provider IDs.\n2. Set staging environment variables:\n+\n+```\n+CALENDAR_SYNC_ENABLED=true\n+CALENDAR_JOBS_ENABLED=true\n+```\n+\n+3. Restart staging application if necessary.\n+4. Trigger job for an allowlisted provider:\n+\n+```\n+curl -X POST https://staging-url/api/admin/calendar/jobs/run \\\n+  -H \"Authorization: Bearer <admin-token>\" \\\n+  -H \"Content-Type: application/json\" \\\n+  -d '{\"provider_id\":\"<provider_uuid_1>\"}'\n+```\n+\n+5. Verify results:\n+  - `external_calendar_connections.last_synced_at` updated\n+  - `external_calendar_events` ingested items\n+  - No errors in `last_error`\n+\n+## Notes\n+\n+- Job runner respects allowlist and flags. If job returns `CALENDAR_JOBS_DISABLED`, verify env vars.\n+- For manual testing, use admin endpoint with admin credentials.\n+\n*** End Patch
