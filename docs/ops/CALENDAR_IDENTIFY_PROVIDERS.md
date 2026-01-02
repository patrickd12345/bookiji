# Identify Test Providers (Staging)

Date: 2026-01-02
Operator: Automated agent

## Objective

Identify 1-2 provider accounts in staging to be allowlisted for the initial calendar sync enablement.

## Suggested Query

```sql
SELECT id, email, created_at
FROM profiles
WHERE role = 'provider'
ORDER BY created_at DESC
LIMIT 5;
```

## Notes

- Choose providers with recent test activity and without production data.
- Verify these providers have or can create `external_calendar_connections` records for Google or Microsoft adapters.

## Deliverable

- Document selected provider IDs and emails in the staging enablement report.

