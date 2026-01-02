## Calendar Sync Backoff Verification

Date: 2026-01-02
Operator: Automated agent

## Objective

Verify backoff behavior: when adapters fail or rate limit, `backoff_until` is set and sync job skips the connection.

## Steps

1. Simulate an adapter failure for a connection (e.g., invalid token), or manually set `last_error` and increment `error_count`.\n2. Run sync job and verify `external_calendar_connections.backoff_until` is set to a future timestamp.\n3. Run sync job again and verify connection is skipped while `backoff_until > NOW()`.\n4. After backoff expiry, re-run sync and verify connection is processed and `backoff_until` cleared on success.\n\n## Sample SQL (manual set)\n\n```sql\nUPDATE external_calendar_connections\nSET backoff_until = NOW() + INTERVAL '5 minutes', error_count = error_count + 1, last_error = 'Simulated failure'\nWHERE id = '<connection_id>';\n```\n\n## Notes\n\n- Backoff durations are set in code (e.g., 5 minutes on first failure). Monitor `error_count` to track repeated failures.\n\n*** End Patch
