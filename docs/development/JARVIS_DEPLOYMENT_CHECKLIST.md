# Jarvis Deployment Checklist

**Status:** Ready to Deploy  
**Last Updated:** 2025-01-27

## Pre-Deploy (10 minutes)

### 1. Secrets Sanity ✅

```bash
# Verify only one LLM key is set
echo $GROQ_API_KEY  # Should be set OR
echo $OPENAI_API_KEY  # Should be set (not both)

# Verify Twilio credentials
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN
echo $TWILIO_FROM

# Verify owner phone
echo $JARVIS_OWNER_PHONE
```

**Check:** Run `pnpm jarvis:pre-deploy`

### 2. Environment Guards ✅

Verify `APP_ENV=prod` hard-blocks:
- ✅ SimCity (already enforced)
- ✅ Destructive admin ops (already enforced)
- ✅ Jarvis can run in prod (read + safe levers only)

**Verification:**
```bash
# Check environment guards exist
grep -r "isProduction" src/lib/env/
grep -r "assertSimCityAllowed" src/
```

### 3. Database Migration ✅

```bash
# Apply migration
supabase db push

# Verify table exists
supabase db execute "SELECT * FROM jarvis_incidents LIMIT 1;"
```

### 4. SMS Loop Dry-Run ✅

```bash
# Start dev server
pnpm dev

# In another terminal, run dry-run
pnpm jarvis:dry-run
```

**Test Replies:**
- `A` - Should execute option A
- `B+C` - Should execute B and C
- `Hold. Baby woke up. Don't wake me unless worse` - Should parse constraints

**Expected:**
- ✅ One confirmation SMS per reply
- ✅ Actions executed successfully
- ✅ Constraints noted
- ✅ Silence afterward unless severity escalates

## Deployment Steps

### 1. Apply Migration

```bash
supabase db push
```

### 2. Set Environment Variables

In Vercel (or your hosting platform):

```bash
JARVIS_OWNER_PHONE=+1234567890
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM=+1234567890
GROQ_API_KEY=your_key  # OR OPENAI_API_KEY
VERCEL_CRON_SECRET=your_secret
```

### 3. Configure Cron Job

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/jarvis-monitor",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### 4. Deploy

```bash
git add .
git commit -m "feat: Deploy Jarvis incident commander"
git push
```

### 5. Verify

```bash
# Check cron is running
curl https://www.bookiji.com/api/cron/jarvis-monitor \
  -H "Authorization: Bearer $VERCEL_CRON_SECRET"

# Check detection endpoint
curl -X POST https://www.bookiji.com/api/jarvis/detect \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'
```

## Post-Deploy Verification

### 1. First Alert Test

Wait for first cron run (5 minutes) or trigger manually:

```bash
curl -X POST https://www.bookiji.com/api/jarvis/detect \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'
```

**Expected:**
- If system healthy: `{"success": true, "message": "No alert needed"}`
- If incident detected: SMS received with options

### 2. Reply Test

Reply to SMS with:
- `A` - Should receive confirmation
- `B+C` - Should execute both actions
- Natural language - Should parse correctly

### 3. Duplicate Suppression Test

Trigger same incident twice within 45 minutes:

```bash
# First trigger
curl -X POST https://www.bookiji.com/api/jarvis/detect ...

# Second trigger (should be suppressed)
curl -X POST https://www.bookiji.com/api/jarvis/detect ...
```

**Expected:** Second trigger returns `duplicate_suppressed: true`

### 4. No-Reply Default Test

1. Trigger incident
2. Don't reply for 15+ minutes
3. Next cron run should execute default action
4. Should receive follow-up SMS

## Monitoring

### Logs to Watch

- `[Jarvis]` - All Jarvis operations
- `incident_*` - Incident IDs
- `duplicate_suppressed` - Duplicate alerts prevented
- `no_reply_default` - Default actions executed

### Metrics

- Incident detection rate
- SMS delivery success rate
- Reply processing time
- Action execution success rate
- Duplicate suppression rate

## Rollback Plan

If Jarvis causes issues:

1. **Disable cron:**
   - Remove from `vercel.json`
   - Redeploy

2. **Disable endpoints:**
   - Add feature flag check
   - Return 503 from endpoints

3. **Database:**
   - Migration is non-destructive
   - Table can be dropped if needed

## Support

- Documentation: `docs/development/JARVIS_INCIDENT_COMMANDER.md`
- Pre-deploy check: `pnpm jarvis:pre-deploy`
- Dry-run test: `pnpm jarvis:dry-run`

---

**Remember:** Jarvis is boring when things are fine. That's the highest compliment.











