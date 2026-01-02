## Set Calendar Provider Allowlist (Staging)

Date: 2026-01-02
Operator: Automated agent

## Objective

Set `CALENDAR_ALLOWLIST_PROVIDER_IDS` in the staging environment to limit calendar sync to 1-2 providers.

## Suggested Procedure

1. Determine provider IDs (see `docs/ops/CALENDAR_IDENTIFY_PROVIDERS.md`)\n2. Update staging environment variable (via deployment/UI/secret manager):\n+\n+```\n+CALENDAR_ALLOWLIST_PROVIDER_IDS=<provider_uuid_1>,<provider_uuid_2>\n+```\n+\n+3. Restart application or ensure environment reload for the change to take effect.\n+4. Validate:\n+\n+```\n+# In staging, test via script or admin endpoint\n+curl -X POST https://staging-url/api/admin/calendar/jobs/run \\\n+  -H \"Authorization: Bearer <admin-token>\" \\\n+  -H \"Content-Type: application/json\" \\\n+  -d '{\"provider_id\":\"<provider_uuid_1>\"}'\n+```\n+\n+## Notes\n+\n+- This change should be performed only in staging for initial rollout.\n+- Keep production `CALENDAR_ALLOWLIST_PROVIDER_IDS` empty until production rollout approval.\n+\n*** End Patch
