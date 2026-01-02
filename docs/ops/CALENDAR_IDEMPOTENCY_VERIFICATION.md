# Calendar Idempotency Verification

Date: 2026-01-02
Operator: Automated agent

## Objective

Verify idempotency for inbound and outbound calendar sync: no duplicate events and checksums prevent unnecessary updates.

## Tests to Run

1. Create a booking for allowlisted provider -> verify one `external_calendar_events` mapping created.\n2. Re-run sync job -> verify no additional mapping created (count remains 1).\n3. Update booking (change time/notes) -> re-run sync -> verify existing mapping updated (checksum changes) and still single mapping exists.\n4. Delete booking/cancel -> re-run sync -> verify mapping is marked CANCELLED or deleted per adapter behavior.\n\n## Queries\n\n- Count events for booking:\n\n```sql\nSELECT COUNT(*) FROM external_calendar_events WHERE booking_id = '<booking_id>' AND calendar_provider = 'google';\n```\n\n- Check checksum:\n\n```sql\nSELECT checksum FROM external_calendar_events WHERE booking_id = '<booking_id>' AND calendar_provider = 'google';\n```\n\n## Notes\n\n- Ensure the unique index `(booking_id, calendar_provider)` is present and enforced.\n- If adapter is missing update support, the fallback create path may be used – validate mapping behavior in such cases.\n\n*** End Patch
