# Rollback Procedures

This document provides calm, predefined rollback guidance during incidents.

## Principles

1. **Rollback is not failure**: Rolling back is a valid operational decision.
2. **Preserve evidence**: Capture logs, metrics, and state before rolling back.
3. **Smallest safe rollback**: Roll back only what's necessary to restore service.
4. **No clever fixes**: During an incident, roll back. Fix later.

## Rollback Types

### A) Code Rollback (Deploy Rollback)

**When to use:**
- Recent deployment correlates with incident start time
- Error patterns match changed code paths
- Incident started within 2 hours of deployment

**Checklist:**
1. Identify deployment commit/tag from Operations Changelog
2. Capture current deployment status (Vercel dashboard)
3. Note any environment variables changed in this deployment
4. Execute rollback via deployment platform (Vercel: Deployments → Previous → Promote)
5. Verify rollback deployment is live (check deployment URL/timestamp)
6. Monitor for 15 minutes to confirm incident resolution

**Cautions:**
- Do not roll back multiple deployments at once
- Do not modify code during rollback
- Do not skip verification step

---

### B) Config Rollback (Environment Variables / Feature Flags)

**When to use:**
- Feature flag change correlates with incident
- Environment variable modification matches incident timing
- System behavior changed without code deployment

**Checklist:**
1. Identify changed config from Operations Changelog
2. Document current values (screenshot or copy)
3. Revert to previous known-good values
4. Restart affected services if required
5. Verify config change is active (check env vars or feature flag API)
6. Monitor for 15 minutes

**Cautions:**
- Do not change multiple config values simultaneously
- Do not use config rollback as a workaround for code issues
- Verify config format matches expected type (string, boolean, number)

---

### C) Database Rollback (Migrations / Data)

**When to use:**
- Database schema change correlates with incident
- Data migration caused data corruption
- Query performance degraded after migration

**Checklist:**
1. Identify migration from Operations Changelog
2. **CRITICAL**: Create database backup before rollback
3. Locate rollback migration file (format: `*_rollback_*.sql`)
4. Verify rollback migration exists and is tested
5. Execute via Supabase CLI: `supabase db push --include-all`
6. Verify schema matches pre-migration state
7. Check application connectivity and basic queries

**Cautions:**
- **NEVER** execute SQL directly against production database
- **NEVER** skip backup step
- **NEVER** roll back migrations that other systems depend on without coordination
- If rollback migration doesn't exist, escalate to database owner

---

### D) Third-Party Outage Mitigation

**When to use:**
- Third-party service (Stripe, Supabase, email provider) is down or degraded
- Incident correlates with third-party status page
- Error patterns match third-party API failures

**Checklist:**
1. Verify third-party status (status page, health endpoint)
2. Check if incident affects all users or specific features
3. Enable fallback mode if available (graceful degradation)
4. Document affected features and user impact
5. Monitor third-party status for resolution
6. Disable fallback mode when service restored

**Cautions:**
- Do not modify third-party configurations during outage
- Do not attempt to "fix" third-party issues
- Do not roll back code changes unless they're blocking fallback mode

---

## Evidence to Preserve

Before and during rollback, capture:

1. **Timeline**: Incident start time, change deployment time, rollback time
2. **Metrics**: Error rates, latency, throughput (screenshots or exports)
3. **Logs**: Application logs, database logs, deployment logs (last 1 hour)
4. **State**: Current deployment version, config values, feature flags
5. **User impact**: Affected endpoints, error messages, user reports

**Storage**: Save to incident folder or postmortem document.

---

## Required Follow-Up

After rollback:

1. **Confirm resolution**: Verify incident is resolved (15-minute observation)
2. **Document decision**: Add entry to Operations Changelog with rollback details
3. **Schedule postmortem**: If SEV-1 or higher, schedule within 48 hours
4. **Root cause**: Investigate why change caused incident (after service restored)
5. **Prevent recurrence**: Update change process if needed

**Do not:**
- Redeploy the same change immediately
- Skip postmortem for SEV-1+ incidents
- Blame individuals

---

## Quick Reference

| Change Type | Rollback Method | Time Estimate |
|------------|----------------|---------------|
| Code | Deployment platform | 5-10 minutes |
| Config | Environment variables | 2-5 minutes |
| Database | Migration rollback | 15-30 minutes |
| Third-party | Fallback mode | 1-5 minutes |

**Remember**: During an incident, roll back first, investigate later.





















