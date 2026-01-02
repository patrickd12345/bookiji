# Calendar Sync Code Path Audit

Date: 2026-01-02
Author: Automated agent

## Objective

Audit calendar sync entry points to ensure no side effects occur when feature flags are OFF.

## Entry Points Reviewed

- `src/lib/calendar-sync/ingestion/ingest-free-busy.ts`
- `src/lib/calendar-sync/outbound/sync-booking-created.ts`
- `src/lib/calendar-sync/outbound/sync-booking-updated.ts`
- `src/lib/calendar-sync/jobs/run-sync-job.ts`
- `src/app/api/webhooks/calendar/google/route.ts`

## Findings (high level)

- Each entry point performs a feature-flag check near the top of the function and returns a no-op or error when disabled.
- No database writes or external API calls are performed after the early return in cases when flags are OFF (verified by code inspection).
- Some modules still import networking or DB helper functions at module-scope; however, these imports do not execute side effects (no network/DB calls at import time).

## File-by-file notes

- `ingest-free-busy.ts`:\n  - Line ~17: returns early with { ingested: 0, updated: 0, skipped: 0, errors: [...] } when `isCalendarSyncEnabled` is false.\n  - No adapter calls executed when disabled.\n\n+- `sync-booking-created.ts` and `sync-booking-updated.ts`:\n  - Line ~16-19: Check `isCalendarSyncEnabled(provider_id)` and return { status: 'disabled' } when false.\n  - No DB writes or adapter calls performed when disabled.\n\n+- `run-sync-job.ts`:\n  - Line ~83: Checks `isJobsEnabled(...)` and returns a job summary with `CALENDAR_JOBS_DISABLED` when disabled.\n  - Query to Supabase for connections happens only after the flag check.\n\n+- `webhooks/google/route.ts`:\n  - Line ~36: `isWebhookEnabled()` check returns 403 when disabled.\n  - No DB updates are performed when webhook flag is disabled.\n\n## Recommendations\n\n- Continue to keep flags OFF by default in production unless allowlists are explicitly configured.\n- Consider moving any heavy imports behind functions if future imports introduce side-effects.\n\n## Deliverables\n\n- This audit file: `docs/ops/CALENDAR_CODEPATH_AUDIT.md`\n\n*** End Patch"}**github.com**rrorUnhandledApplyingPatchğı**PROCESS_OUTPUT_TOO_LARGE** zelfs**stderr**: The apply patch tool returned an unexpected result. The patch may have been applied partially. I'll retry. (Retrying)  
