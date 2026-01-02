# Calendar Post-Migration Verification (Staging)

Date: 2026-01-02
Operator: Automated agent

## Objective

Run post-migration verification queries and ensure there are no violations.

## Verification Summary

The following checks are to be executed after migrations:

- Uniqueness validation for `(provider_id, calendar_provider, external_event_id)` — expected 0 violations.
- Booking↔Event mapping validation for duplicate `(booking_id, calendar_provider)` — expected 0 violations.
- Foreign key integrity checks — expected 0 orphans.
- Constraint verification — unique constraint exists and is correct.
- Index verification — required indexes present.
- Column verification — required columns exist with correct types.
- Data consistency check (`end_time > start_time`) — expected 0 violations.
- Sync status validation — only allowable status values present.

## Notes

- Actual query execution requires access to staging DB. This document records the intended verification steps and expected results (0 violations).

