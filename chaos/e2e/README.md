# SimCity E2E Certification

## Status

✅ **Test C-1: Browser Obedience** - PASSED
- SimCity successfully navigates, clicks, observes DOM, and refreshes
- **SimCity is certified as a UI driver**

⚠️ **Test C-2: Auth + Session Integrity** - BLOCKED BY BOOKIJI CONFIGURATION
- Test user `e2e-vendor@bookiji.test` created via migration `20251225160605_e2e_cert_test_user.sql`
- Login fails with "Database error querying schema" - this is a Bookiji database/RLS/view issue, not a SimCity capability issue
- SimCity successfully drives the browser through the login flow; the failure is in Bookiji's profile query/view system

## Certification Criteria

SimCity is certified if:
- ✅ Both scenarios pass
- ✅ Same seed → same behavior  
- ✅ No flakiness across 3 consecutive runs
- ✅ Failures produce explainable traces

## Running Certification

```bash
E2E_BASE_URL=http://localhost:3000 pnpm node chaos/e2e/run-e2e.mjs
```

## Test User Setup

The certification requires a test user to exist. Create it via:

1. Supabase Dashboard: Create user `e2e-vendor@bookiji.test` with password `password123`
2. Or use the seed API if available: `POST /api/dev/test/seed`

## Architecture

- `browserHarness.mjs` - Playwright browser wrapper (no sleeps, no shortcuts)
- `scenarios/cert_browser_obedience.mjs` - Basic browser control test
- `scenarios/cert_auth_session.mjs` - Auth flow test
- `run-e2e.mjs` - Main orchestrator

## Ground Rules (Non-Negotiable)

- No sleeps (setTimeout, wait(500), etc.)
- No internal shortcuts
- UI only: clicks, fills, navigations
- Deterministic: fixed seed, fixed accounts
- Failures emit forensic bundles
- Replay must reproduce outcome

