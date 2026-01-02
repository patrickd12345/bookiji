## Outbound Sync Testing (Staging)

Date: 2026-01-02
Operator: Automated agent

## Objective

Verify that bookings created for allowlisted providers produce outbound calendar events persisted in `external_calendar_events`.

## Test Steps

1. Create a test booking for an allowlisted provider via API or DB insert.\n2. Wait for outbound sync logic to run (or trigger via admin endpoint if immediate processing required).\n3. Query `external_calendar_events`:\n+\n+```sql\n+SELECT * FROM external_calendar_events WHERE booking_id = '<test_booking_id>' LIMIT 10;\n+```\n+\n+4. Verify:\n+  - Event exists and `booking_id` is set\n+  - `sync_status` is `CREATED` or `UPDATED`\n+  - `last_error` is NULL\n+  - `checksum` is populated\n+\n+## Idempotency check\n+\n+1. Re-run sync or re-create booking event\n+2. Verify no duplicate `external_calendar_events` exist for same `booking_id` and `calendar_provider`\n+\n+## Notes\n+\n+- Outbound adapter may be mocked in staging; ensure adapter is configured to accept create/update calls.\n+\n*** End Patch
