# Calendar Staging Provider Allowlist

Date: 2026-01-02
Operator: Platform Engineering

## Purpose

This document documents the allowlisted provider_id for staging calendar sync enablement. Only allowlisted providers can use calendar sync features in staging.

## Allowlist Configuration

### Environment Variable

Set the following environment variable in staging:

```bash
CALENDAR_ALLOWLIST_PROVIDER_IDS=<provider-uuid>
```

Where `<provider-uuid>` is the UUID of the test provider from the `profiles` table.

### Finding a Test Provider

To find a suitable test provider:

```sql
SELECT id, email, full_name 
FROM profiles 
WHERE role = 'provider' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Verification

Verify allowlist is working:

1. Check flag enforcement:
   ```typescript
   import { isCalendarSyncEnabled, isProviderAllowed } from '@/lib/calendar-sync/flags'
   
   const providerId = '<provider-uuid>'
   console.log('Sync enabled:', isCalendarSyncEnabled(providerId))
   console.log('Provider allowed:', isProviderAllowed(providerId))
   ```

2. Test via API:
   ```bash
   curl -X GET "https://staging.bookiji.com/api/calendar/sync?provider_id=<provider-uuid>" \
     -H "Authorization: Bearer <token>"
   ```

## Current Allowlisted Provider

**Provider ID:** `[TO BE SET IN STAGING ENVIRONMENT]`

**Provider Details:**
- Email: `[TO BE DOCUMENTED]`
- Name: `[TO BE DOCUMENTED]`
- Allowlisted Date: `[TO BE DOCUMENTED]`

## Notes

- Only one provider should be allowlisted during initial staging enablement
- Additional providers can be added after validation is complete
- Provider must have a valid external calendar connection (Google or Microsoft)
- All calendar operations for non-allowlisted providers will be rejected

## Removal

To remove a provider from the allowlist:

1. Remove provider ID from `CALENDAR_ALLOWLIST_PROVIDER_IDS`
2. Restart application services
3. Verify provider can no longer access calendar features
