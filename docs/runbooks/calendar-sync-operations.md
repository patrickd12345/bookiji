# Calendar Sync Operations Runbook

## Overview

This runbook provides operational procedures for managing calendar sync in production.

## Triage Procedures

### Check Sync Status

1. Query sync state for a provider:
   ```sql
   SELECT 
     provider_id,
     provider,
     sync_enabled,
     last_synced_at,
     error_count,
     last_error,
     backoff_until
   FROM external_calendar_connections
   WHERE provider_id = '<provider_id>';
   ```

2. Check recent sync activity:
   ```sql
   SELECT 
     provider_id,
     provider,
     last_synced_at,
     error_count,
     last_error
   FROM external_calendar_connections
   WHERE last_synced_at > NOW() - INTERVAL '24 hours'
   ORDER BY last_synced_at DESC;
   ```

### Identify Stuck Syncs

1. Find connections that haven't synced recently:
   ```sql
   SELECT 
     id,
     provider_id,
     provider,
     last_synced_at,
     sync_enabled,
     backoff_until
   FROM external_calendar_connections
   WHERE sync_enabled = true
     AND (last_synced_at IS NULL OR last_synced_at < NOW() - INTERVAL '1 hour')
     AND (backoff_until IS NULL OR backoff_until < NOW())
   ORDER BY last_synced_at ASC NULLS FIRST;
   ```

2. Check for connections in permanent backoff:
   ```sql
   SELECT 
     id,
     provider_id,
     provider,
     backoff_until,
     error_count,
     last_error
   FROM external_calendar_connections
   WHERE backoff_until > NOW()
   ORDER BY backoff_until DESC;
   ```

### Check Error Logs

1. View recent errors:
   ```sql
   SELECT 
     provider_id,
     provider,
     error_count,
     last_error,
     last_synced_at
   FROM external_calendar_connections
   WHERE error_count > 0
   ORDER BY error_count DESC, last_synced_at DESC
   LIMIT 50;
   ```

2. Check application logs for calendar sync errors:
   - Filter logs by category: `calendar_sync`
   - Look for entries with `level: 'error'`
   - Check `error_code` and `metadata` fields

### View Allowlist

1. Check environment variables:
   ```bash
   echo $CALENDAR_ALLOWLIST_PROVIDER_IDS
   echo $CALENDAR_ALLOWLIST_CONNECTION_IDS
   ```

2. Verify allowlist membership:
   - Provider IDs: Check if provider_id is in `CALENDAR_ALLOWLIST_PROVIDER_IDS`
   - Connection IDs: Check if connection_id is in `CALENDAR_ALLOWLIST_CONNECTION_IDS`

## Kill-Switch Procedures

### Disable via Flags

1. **Disable all calendar sync:**
   ```bash
   CALENDAR_SYNC_ENABLED=false
   ```
   Restart application.

2. **Disable specific features:**
   ```bash
   CALENDAR_OAUTH_ENABLED=false      # Disable OAuth
   CALENDAR_JOBS_ENABLED=false        # Disable job runner
   CALENDAR_WEBHOOK_ENABLED=false     # Disable webhooks
   ```

### Remove from Allowlist

1. **Remove provider from allowlist:**
   - Edit `CALENDAR_ALLOWLIST_PROVIDER_IDS` environment variable
   - Remove the provider_id from comma-separated list
   - Restart application

2. **Remove connection from allowlist:**
   - Edit `CALENDAR_ALLOWLIST_CONNECTION_IDS` environment variable
   - Remove the connection_id from comma-separated list
   - Restart application

### Enable Backoff for Specific Connection

1. **Manually set backoff:**
   ```sql
   UPDATE external_calendar_connections
   SET backoff_until = NOW() + INTERVAL '1 hour'
   WHERE id = '<connection_id>';
   ```

2. **Clear backoff:**
   ```sql
   UPDATE external_calendar_connections
   SET backoff_until = NULL
   WHERE id = '<connection_id>';
   ```

## Rollout Procedures

### Add Provider to Allowlist

1. **Get provider_id:**
   ```sql
   SELECT id, email FROM profiles WHERE email = '<provider_email>';
   ```

2. **Add to allowlist:**
   - Edit `CALENDAR_ALLOWLIST_PROVIDER_IDS` environment variable
   - Add provider_id to comma-separated list: `existing_id,new_provider_id`
   - Restart application

3. **Verify:**
   - Check that OAuth endpoints return 200 (not 403)
   - Check that sync endpoints work for this provider

### Enable Flags in Production

1. **Enable flags one at a time:**
   - Start with `CALENDAR_OAUTH_ENABLED=true` (OAuth only)
   - Monitor for 24 hours
   - Then enable `CALENDAR_SYNC_ENABLED=true` (sync operations)
   - Monitor for 24 hours
   - Then enable `CALENDAR_JOBS_ENABLED=true` (job runner)
   - Monitor for 24 hours
   - Finally enable `CALENDAR_WEBHOOK_ENABLED=true` (webhooks)

2. **Always set allowlists in production:**
   - Never enable flags without allowlists in production
   - Start with a single provider_id in allowlist
   - Gradually expand allowlist as confidence grows

### Monitor First Runs

1. **Check job run summaries:**
   - Query admin endpoint: `POST /api/admin/calendar/jobs/run`
   - Review `summary` response for errors
   - Check `connections_failed` and `errors` fields

2. **Monitor logs:**
   - Watch for `calendar_sync` category logs
   - Check for `error` level entries
   - Verify token redaction (no tokens in logs)

3. **Check database:**
   - Verify `last_synced_at` is updating
   - Check `error_count` is not increasing
   - Verify `sync_needed` flag is being cleared

## Common Issues

### OAuth Token Expired

**Symptoms:**
- OAuth endpoints return 401/403
- Sync jobs fail with authentication errors
- `last_error` contains "token expired" or "invalid_token"

**Resolution:**
1. Check token expiry:
   ```sql
   SELECT id, provider_id, token_expiry, NOW() as current_time
   FROM external_calendar_connections
   WHERE token_expiry < NOW();
   ```

2. Re-authenticate:
   - Provider needs to reconnect via OAuth flow
   - New tokens will be stored automatically

3. Clear backoff if set:
   ```sql
   UPDATE external_calendar_connections
   SET backoff_until = NULL
   WHERE id = '<connection_id>';
   ```

### Rate Limiting

**Symptoms:**
- Sync jobs fail with 429 errors
- `backoff_until` is set in future
- `error_count` increases

**Resolution:**
1. Check backoff status:
   ```sql
   SELECT id, provider_id, backoff_until, error_count
   FROM external_calendar_connections
   WHERE backoff_until > NOW();
   ```

2. Wait for backoff to expire (automatic)
3. If persistent, increase backoff duration in code or reduce sync frequency

### Adapter Failures

**Symptoms:**
- Sync jobs fail with adapter-specific errors
- `last_error` contains adapter error messages

**Resolution:**
1. Check adapter type:
   ```sql
   SELECT provider FROM external_calendar_connections WHERE id = '<connection_id>';
   ```

2. Verify adapter configuration:
   - Google: Check `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
   - Microsoft: Check Microsoft OAuth configuration

3. Check adapter logs for provider-specific errors

### Database Errors

**Symptoms:**
- Sync jobs fail with database errors
- `last_error` contains SQL errors

**Resolution:**
1. Check database connectivity
2. Verify table schema is up to date:
   ```sql
   \d external_calendar_connections
   \d external_calendar_events
   ```

3. Check for missing columns (run migration if needed)
4. Verify foreign key constraints are valid

## Emergency Procedures

### Complete Shutdown

1. Set all flags to false:
   ```bash
   CALENDAR_SYNC_ENABLED=false
   CALENDAR_OAUTH_ENABLED=false
   CALENDAR_JOBS_ENABLED=false
   CALENDAR_WEBHOOK_ENABLED=false
   ```

2. Restart application

3. All calendar operations will return 403

### Selective Disable

1. Disable only problematic feature:
   - OAuth issues: `CALENDAR_OAUTH_ENABLED=false`
   - Sync issues: `CALENDAR_SYNC_ENABLED=false`
   - Job issues: `CALENDAR_JOBS_ENABLED=false`
   - Webhook issues: `CALENDAR_WEBHOOK_ENABLED=false`

2. Restart application

3. Other features continue to work

### Data Recovery

1. **Reset sync state:**
   ```sql
   UPDATE external_calendar_connections
   SET 
     sync_cursor = NULL,
     last_synced_at = NULL,
     error_count = 0,
     last_error = NULL,
     backoff_until = NULL
   WHERE id = '<connection_id>';
   ```

2. **Clear failed events:**
   ```sql
   UPDATE external_calendar_events
   SET sync_status = 'CREATED', last_error = NULL
   WHERE sync_status = 'FAILED'
     AND provider_id = '<provider_id>';
   ```
