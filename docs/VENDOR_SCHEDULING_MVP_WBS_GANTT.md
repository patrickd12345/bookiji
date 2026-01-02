# Bookiji — Vendor Scheduling MVP: Waterfall WBS + Gantt Schedule

**Project Start Date (Future):** 2026-01-05  
**Last Updated:** 2026-01-05  
**Schedule Type:** Waterfall with Gate Milestones

---

## Section 1: PAST (Approximate Actuals)

*Work completed before 2026-01-05. Dates are approximate based on typical project progression and evidence in codebase.*

| WBS ID | Task Name | Phase | Duration (workdays) | Dependencies | Start Date | Target Date | Status | % Complete | Evidence / Deliverable |
|--------|-----------|-------|-------------------|--------------|------------|-------------|--------|------------|------------------------|
| P-001 | Project repository initialization | Discovery | 2 | - | 2025-08-15 | 2025-08-16 | Done | 100 | `package.json`, `next.config.ts`, `turbo.json` |
| P-002 | Next.js 15 + TypeScript scaffolding | Build | 3 | P-001 | 2025-08-17 | 2025-08-19 | Done | 100 | `src/app/`, `tsconfig.json`, App Router structure |
| P-003 | Supabase project setup & local dev | Build | 4 | P-001 | 2025-08-20 | 2025-08-23 | Done | 100 | `supabase/` directory, local Supabase running |
| P-004 | Core database schema (profiles, services, bookings) | Build | 5 | P-003 | 2025-08-24 | 2025-08-30 | Done | 100 | `supabase/migrations/20250819190000_complete_database_schema.sql` |
| P-005 | Authentication & RLS policies | Build | 4 | P-004 | 2025-08-31 | 2025-09-04 | Done | 100 | Auth routes, RLS policies in migrations |
| P-006 | Basic booking engine (create, confirm, cancel) | Build | 6 | P-004 | 2025-09-05 | 2025-09-12 | Done | 100 | `src/lib/bookingEngine.ts`, `src/app/api/bookings/*/route.ts` |
| P-007 | Availability engine (slot computation) | Build | 5 | P-004 | 2025-09-13 | 2025-09-19 | Done | 100 | `src/lib/availabilityEngine.ts`, `tests/lib/availabilityEngine.spec.ts` |
| P-008 | Vendor subscription lifecycle (schema + API) | Build | 5 | P-004 | 2025-12-24 | 2025-12-30 | Done | 100 | `supabase/migrations/20251224205800_vendor_subscriptions.sql`, `/api/vendor/subscription/*` |
| P-009 | Payment-free vendor booking flows | Build | 3 | P-006, P-008 | 2025-12-31 | 2026-01-02 | Done | 100 | `src/app/api/vendor/bookings/create/route.ts`, `vendor_created` flag |
| P-010 | Google Calendar OAuth foundation | Build | 4 | P-003 | 2025-09-20 | 2025-09-25 | Done | 100 | `src/app/api/auth/google/*`, `provider_google_calendar` table |
| P-011 | One-way calendar sync (free/busy read) | Build | 5 | P-010 | 2025-09-26 | 2025-10-02 | Done | 100 | `src/app/api/calendar/sync/route.ts`, `src/lib/calendar-adapters/google.ts` |
| P-012 | Credits/loyalty database schema | Build | 3 | P-004 | 2025-10-03 | 2025-10-07 | Done | 100 | `user_credits`, `credit_transactions` tables in migrations |
| P-013 | Basic credits service (earn/spend) | Build | 4 | P-012 | 2025-10-08 | 2025-10-11 | Done | 100 | `src/lib/credits.ts`, `src/app/api/credits/*/route.ts` |
| P-014 | Unit test framework (Vitest) | Verify | 3 | P-006, P-007 | 2025-09-20 | 2025-09-24 | Done | 100 | `vitest.config.ts`, `tests/lib/bookingEngine.spec.ts`, `tests/lib/availabilityEngine.spec.ts` |
| P-015 | API E2E test suite (Playwright) | Verify | 5 | P-006 | 2025-10-12 | 2025-10-18 | Done | 100 | `tests/api/bookings.*.spec.ts`, `tests/api/availability.spec.ts` |
| P-016 | UI E2E test suite (customer/vendor flows) | Verify | 4 | P-006 | 2025-10-19 | 2025-10-24 | Done | 100 | `tests/e2e/bookings/customer-flow.spec.ts`, `tests/e2e/bookings/vendor-flow.spec.ts` |
| P-017 | Atomic booking claim (race condition fix) | Build | 3 | P-006 | 2026-01-01 | 2026-01-03 | Done | 100 | `supabase/migrations/20260101135426_enforce_booking_atomicity.sql`, `claim_slot_and_create_booking()` RPC |
| P-018 | Vendor scheduling UI (basic) | Build | 4 | P-007, P-008 | 2025-12-20 | 2025-12-23 | Done | 100 | `src/app/vendor/schedule/page.tsx`, `ScheduleClient.tsx` |

---

## Section 2: FUTURE (Plan)

*Work planned from 2026-01-05 onward. All dates are business days (Mon–Fri).*

### Gate Milestones

| Milestone ID | Milestone Name | Target Date | Dependencies |
|--------------|----------------|-------------|--------------|
| M-REQ | REQ Baseline Approved | 2026-01-12 | F-001, F-002, F-003 |
| M-DES | Design Baseline Approved | 2026-01-19 | F-004, F-005, F-006 |
| M-CODE | Code Freeze | 2026-03-14 | All Build tasks |
| M-TEST | Test Plan Approved | 2026-01-26 | F-007, F-008 |
| M-RC | Release Candidate | 2026-03-21 | All Verify tasks |
| M-PROD | Production Approval | 2026-03-28 | M-RC, F-040, F-041 |

---

### FUTURE Tasks Table

| WBS ID | Task Name | Phase | Duration (workdays) | Dependencies | Start Date | Target Date | Status | % Complete | Evidence / Deliverable |
|--------|----------|-------|---------------------|--------------|------------|-------------|--------|------------|------------------------|
| **F-001** | **Requirements: Vendor availability hardening** | Requirements | 2 | - | 2026-01-05 | 2026-01-06 | Not Started | 0 | `/docs/requirements/vendor-availability-hardening.md` |
| F-002 | Requirements: Calendar sync 2-way | Requirements | 2 | - | 2026-01-05 | 2026-01-06 | Not Started | 0 | `/docs/requirements/calendar-sync-2way.md` |
| F-003 | Requirements: Loyalty/credits reconciliation | Requirements | 2 | - | 2026-01-05 | 2026-01-06 | Not Started | 0 | `/docs/requirements/loyalty-reconciliation.md` |
| F-004 | Design: Availability conflict resolution | Design | 3 | F-001 | 2026-01-07 | 2026-01-09 | Not Started | 0 | `/docs/design/availability-conflict-resolution.md` |
| F-005 | Design: Calendar sync architecture (ICS + 2-way) | Design | 4 | F-002 | 2026-01-07 | 2026-01-12 | Not Started | 0 | `/docs/design/calendar-sync-architecture.md` |
| F-006 | Design: Credits reconciliation system | Design | 3 | F-003 | 2026-01-10 | 2026-01-12 | Not Started | 0 | `/docs/design/credits-reconciliation.md` |
| **F-007** | **Test plan: Vendor availability hardening** | Verify | 2 | F-001 | 2026-01-13 | 2026-01-14 | Not Started | 0 | `/tests/plan/vendor-availability-hardening.md` |
| F-008 | Test plan: Calendar sync + loyalty | Verify | 2 | F-002, F-003 | 2026-01-13 | 2026-01-14 | Not Started | 0 | `/tests/plan/calendar-loyalty-integration.md` |
| **F-009** | **Vendor availability: Slot conflict detection** | Build | 3 | M-DES, F-004 | 2026-01-20 | 2026-01-22 | Not Started | 0 | `src/lib/availabilityConflictDetector.ts`, unit tests |
| F-010 | Vendor availability: Atomic slot updates | Build | 4 | F-009 | 2026-01-23 | 2026-01-26 | Not Started | 0 | Migration: `enforce_atomic_slot_updates.sql`, RPC function |
| F-011 | Vendor availability: Recurring slot management | Build | 5 | F-010 | 2026-01-27 | 2026-02-03 | Not Started | 0 | `src/lib/recurringSlotManager.ts`, `recurrence_rule` support |
| F-012 | Vendor availability: Block time API | Build | 3 | F-010 | 2026-02-04 | 2026-02-06 | Not Started | 0 | `/api/vendor/availability/block`, migration for `blocked_slots` |
| F-013 | Vendor availability: Conflict resolution UI | Build | 4 | F-009 | 2026-02-07 | 2026-02-12 | Not Started | 0 | `src/components/vendor/ConflictResolutionDialog.tsx` |
| F-014 | Vendor availability: API hardening tests | Verify | 3 | F-009, F-010, F-011 | 2026-02-13 | 2026-02-17 | Not Started | 0 | `tests/api/vendor/availability-hardening.spec.ts` |
| **F-015** | **Calendar sync: 2-way free/busy sync** | Build | 5 | M-DES, F-005 | 2026-01-20 | 2026-01-26 | Not Started | 0 | `src/lib/calendarSync/twoWaySync.ts`, cron job setup |
| F-016 | Calendar sync: Write bookings to Google Calendar | Build | 4 | F-015 | 2026-01-27 | 2026-02-03 | Not Started | 0 | `src/lib/calendarSync/writeToCalendar.ts`, event creation API |
| F-017 | Calendar sync: ICS export endpoint | Build | 3 | F-015 | 2026-02-04 | 2026-02-06 | Not Started | 0 | `/api/vendor/calendar/export.ics`, `src/lib/icsGenerator.ts` |
| F-018 | Calendar sync: ICS import (vendor upload) | Build | 4 | F-017 | 2026-02-07 | 2026-02-12 | Not Started | 0 | `/api/vendor/calendar/import`, `src/lib/icsParser.ts` |
| F-019 | Calendar sync: Invite generation (email) | Build | 3 | F-016 | 2026-02-13 | 2026-02-17 | Not Started | 0 | `src/lib/calendarInvites/generateInvite.ts`, email template |
| F-020 | Calendar sync: Update/cancel event sync | Build | 4 | F-016 | 2026-02-18 | 2026-02-21 | Not Started | 0 | `src/lib/calendarSync/updateEvent.ts`, `cancelEvent.ts` |
| F-021 | Calendar sync: Sync status dashboard | Build | 3 | F-015, F-016 | 2026-02-24 | 2026-02-26 | Not Started | 0 | `src/app/vendor/calendar/sync-status/page.tsx` |
| F-022 | Calendar sync: Integration tests | Verify | 4 | F-015, F-016, F-020 | 2026-02-27 | 2026-03-04 | Not Started | 0 | `tests/integration/calendar-sync.spec.ts` |
| **F-023** | **Loyalty: Earn credits on booking completion** | Build | 3 | M-DES, F-006 | 2026-01-20 | 2026-01-22 | Not Started | 0 | `src/lib/loyalty/earnCredits.ts`, webhook handler update |
| F-024 | Loyalty: Redeem credits at checkout | Build | 3 | F-023 | 2026-01-23 | 2026-01-26 | Not Started | 0 | `src/components/checkout/CreditsRedemption.tsx` (enhance), API update |
| F-025 | Loyalty: Tier progression logic | Build | 4 | F-023 | 2026-01-27 | 2026-02-03 | Not Started | 0 | `src/lib/loyalty/tierCalculator.ts`, migration for tier tracking |
| F-026 | Loyalty: Credits reconciliation job | Build | 5 | F-023, F-024 | 2026-02-04 | 2026-02-10 | Not Started | 0 | `src/lib/loyalty/reconciliation.ts`, cron job, `reconciliation_runs` table |
| F-027 | Loyalty: Reconciliation dashboard | Build | 3 | F-026 | 2026-02-11 | 2026-02-13 | Not Started | 0 | `src/app/admin/loyalty/reconciliation/page.tsx` |
| F-028 | Loyalty: Unit tests (earn/redeem/tier) | Verify | 3 | F-023, F-024, F-025 | 2026-02-14 | 2026-02-18 | Not Started | 0 | `tests/lib/loyalty/*.spec.ts` |
| F-029 | Loyalty: Reconciliation tests | Verify | 3 | F-026 | 2026-02-19 | 2026-02-21 | Not Started | 0 | `tests/integration/loyalty-reconciliation.spec.ts` |
| **F-030** | **GTM: Pricing page updates** | Build | 2 | M-REQ | 2026-01-13 | 2026-01-14 | Not Started | 0 | `src/app/vendor/pricing/page.tsx` (update copy, features) |
| F-031 | GTM: Vendor onboarding flow enhancement | Build | 4 | F-030 | 2026-01-15 | 2026-01-20 | Not Started | 0 | `src/app/vendor/onboarding/page.tsx`, step-by-step wizard |
| F-032 | GTM: Email templates (booking confirmations) | Build | 3 | F-019 | 2026-02-18 | 2026-02-20 | Not Started | 0 | `src/lib/email/templates/booking-confirmation.tsx`, Resend integration |
| F-033 | GTM: Email templates (onboarding sequence) | Build | 3 | F-031 | 2026-01-21 | 2026-01-23 | Not Started | 0 | `src/lib/email/templates/onboarding-sequence.tsx` |
| F-034 | GTM: Monitoring dashboard (vendor metrics) | Build | 4 | M-DES | 2026-01-20 | 2026-01-23 | Not Started | 0 | `src/app/vendor/dashboard/analytics/page.tsx`, metrics API |
| F-035 | GTM: Error alerting (Sentry integration) | Build | 2 | F-034 | 2026-01-24 | 2026-01-25 | Not Started | 0 | Sentry config, alert rules, `src/lib/monitoring/sentry.ts` |
| F-036 | GTM: Performance monitoring (Core Web Vitals) | Build | 2 | F-034 | 2026-01-26 | 2026-01-27 | Not Started | 0 | Vercel Analytics integration, dashboard |
| F-037 | GTM: Documentation (vendor guide) | Build | 3 | F-031 | 2026-01-28 | 2026-02-03 | Not Started | 0 | `/docs/vendor-guide/getting-started.md`, `/docs/vendor-guide/scheduling.md` |
| **F-038** | **Integration: End-to-end booking flow test** | Verify | 4 | F-014, F-022, F-028 | 2026-03-05 | 2026-03-10 | Not Started | 0 | `tests/e2e/integration/booking-flow-complete.spec.ts` |
| F-039 | Integration: Load testing (vendor scheduling) | Verify | 3 | F-038 | 2026-03-11 | 2026-03-13 | Not Started | 0 | `loadtests/vendor-scheduling-load.js`, report |
| **F-040** | **Deploy: Staging deployment** | Deploy | 2 | M-RC | 2026-03-24 | 2026-03-25 | Not Started | 0 | Vercel staging environment, smoke tests pass |
| F-041 | Deploy: Production deployment | Deploy | 2 | F-040 | 2026-03-26 | 2026-03-27 | Not Started | 0 | Production Vercel deploy, monitoring active |
| **F-042** | **Closeout: Project retrospective** | Closeout | 1 | M-PROD | 2026-03-28 | 2026-03-28 | Not Started | 0 | `/docs/retrospectives/vendor-scheduling-mvp-retro.md` |
| F-043 | Closeout: Handoff documentation | Closeout | 2 | F-042 | 2026-03-29 | 2026-04-01 | Not Started | 0 | `/docs/handoff/vendor-scheduling-mvp.md` |

---

## A) Critical Path Summary

**Critical path tasks (drive end date):**

1. **F-001 → F-004 → F-009 → F-010 → F-011 → F-014** (Vendor availability hardening: 18 workdays)
2. **F-002 → F-005 → F-015 → F-016 → F-020 → F-022** (Calendar sync 2-way: 23 workdays)
3. **F-003 → F-006 → F-023 → F-024 → F-026 → F-029** (Loyalty reconciliation: 20 workdays)
4. **F-038 → F-039 → M-RC → F-040 → F-041 → M-PROD** (Integration → Deploy: 15 workdays)

**Longest path:** Calendar sync 2-way (F-002 → F-022) = **23 workdays**  
**Project end date:** 2026-03-28 (M-PROD)  
**Total project duration (future):** ~58 business days from 2026-01-05

**Parallel work opportunities:**
- Vendor availability (F-009–F-014) can run in parallel with Calendar sync (F-015–F-022) after M-DES
- Loyalty (F-023–F-029) can run in parallel with both after M-DES
- GTM tasks (F-030–F-037) can run in parallel with Build tasks after M-REQ

---

## B) Top 10 Schedule Risks (with Mitigation)

| Risk ID | Risk Description | Impact | Probability | Mitigation |
|---------|------------------|--------|-------------|------------|
| R-001 | Google Calendar API rate limits block 2-way sync | High | Medium | Implement exponential backoff, batch operations, cache sync status. Fallback to polling if push fails. |
| R-002 | Calendar sync conflicts with vendor manual edits | High | High | Implement conflict resolution UI (F-013), last-write-wins with audit log, vendor notification on conflicts. |
| R-003 | Credits reconciliation discovers data inconsistencies | High | Medium | Run reconciliation in dry-run mode first, create rollback plan, implement incremental reconciliation. |
| R-004 | ICS import/export format compatibility issues | Medium | Medium | Use established library (ical.js), test with multiple calendar clients (Google, Outlook, Apple), validate edge cases. |
| R-005 | Vendor availability atomic updates cause deadlocks | High | Low | Use advisory locks, implement retry logic with jitter, monitor deadlock metrics, optimize transaction scope. |
| R-006 | Integration test environment instability | Medium | Medium | Use Docker Compose for local test DB, implement test data factories, add retry logic for flaky tests. |
| R-007 | Email delivery delays affect booking confirmations | Medium | Low | Use Resend with retry logic, implement webhook callbacks, add fallback SMS notifications. |
| R-008 | Load testing reveals performance bottlenecks | High | Medium | Run load tests early (after F-014), implement caching, database query optimization, consider read replicas. |
| R-009 | Design baseline approval delayed | High | Low | Schedule design review early (2026-01-19), use async review process, escalate blockers immediately. |
| R-010 | Production deployment rollback required | High | Low | Implement feature flags, blue-green deployment, automated rollback script, monitor error rates post-deploy. |

---

## C) Suggested GitHub Project Field Schema (Roadmap View)

**Fields to add to GitHub Project:**

| Field Name | Field Type | Options / Format |
|------------|------------|------------------|
| **Start** | Date | YYYY-MM-DD (e.g., 2026-01-05) |
| **Target** | Date | YYYY-MM-DD (e.g., 2026-03-28) |
| **Phase** | Single select | Discovery, Requirements, Design, Build, Integrate, Verify, Deploy, Closeout |
| **Status** | Single select | Not Started, In Progress, Blocked, Done, Cancelled |
| **Owner** | Text / User | GitHub username or team name |
| **% Complete** | Number | 0–100 (integer) |
| **WBS ID** | Text | e.g., "F-001", "P-005" |
| **Dependencies** | Text | Comma-separated WBS IDs (e.g., "F-001, F-002") |
| **Deliverable** | Text | File path or artifact name |
| **Risk Level** | Single select | Low, Medium, High (optional) |

**Roadmap View Configuration:**
- Group by: **Phase**
- Sort by: **Start Date** (ascending)
- Filter: **Status != Done** (for active work)
- Timeline: Show **Start** and **Target** dates as bars

**Example Roadmap View:**
```
Phase: Build
├─ F-009: Vendor availability: Slot conflict detection [2026-01-20 → 2026-01-22] [In Progress] [60%]
├─ F-010: Vendor availability: Atomic slot updates [2026-01-23 → 2026-01-26] [Not Started] [0%]
└─ F-015: Calendar sync: 2-way free/busy sync [2026-01-20 → 2026-01-26] [Not Started] [0%]
```

---

## D) Assumptions Used for PAST Approximations

**Assumptions for PAST section (completed work before 2026-01-05):**

1. **Project start:** Assumed project began in mid-August 2025 based on migration timestamps (earliest: `20250819190000_complete_database_schema.sql`).

2. **Typical development velocity:** Assumed 1–2 tasks per week for foundational work, accelerating to 2–3 tasks per week as infrastructure stabilized.

3. **Evidence-based dating:**
   - Migration files provide concrete timestamps (e.g., `20251224205800_vendor_subscriptions.sql` = Dec 24, 2025)
   - Test files created in October 2025 based on `TESTING_STRATEGY_IMPLEMENTATION.md` references
   - Recent work (atomic booking claim) dated to Jan 1, 2026 based on `20260101135426_enforce_booking_atomicity.sql`

4. **Logical sequencing:**
   - Database schema must precede API development
   - Authentication must precede booking engine
   - Basic booking engine must precede vendor-specific flows
   - Calendar OAuth must precede sync functionality
   - Credits schema must precede credits service

5. **Realistic work patterns:**
   - Avoided backdating work to unrealistic early dates
   - Accounted for holidays (Dec 24–31, 2025) with lighter work
   - Recent sprint work (Dec 20–Jan 3) focused on vendor scheduling MVP completion

6. **Test framework timing:** Assumed testing framework setup occurred after core features were built (Sept–Oct 2025), with comprehensive test suites added in Oct 2025.

7. **Vendor subscription work:** Dated to late December 2025 based on migration timestamps and deployment completion docs referencing Dec 31, 2025.

**Note:** These approximations are based on codebase evidence and typical project patterns. Actual historical dates may vary, but the work items and their completion status (Done, 100%) are accurate based on codebase analysis.

---

## Change Request Process

**After REQ Baseline (M-REQ) and Design Baseline (M-DES) approval:**

Any new scope or significant changes to approved requirements/design must follow this process:

1. **Create CR task:** New task with WBS ID format `CR-XX` (e.g., `CR-01`, `CR-02`)
2. **Impact analysis required:**
   - Schedule delta (workdays added/removed)
   - Risk assessment (new risks introduced)
   - Test impact (new tests required, existing tests affected)
   - Dependencies (which tasks are blocked/unblocked)
3. **Approval required:** PM/tech lead must approve CR before work begins
4. **Update WBS:** Add CR task to table with dependencies, dates, deliverables
5. **Re-baseline if needed:** If critical path shifts by >3 workdays, re-baseline schedule

**Example CR task:**
```
CR-01: Add Microsoft Outlook calendar support
- Schedule delta: +5 workdays (F-015, F-016 need Outlook adapter)
- Risk: Medium (new OAuth flow, different API patterns)
- Test impact: +2 test files (outlook-sync.spec.ts, outlook-integration.spec.ts)
- Dependencies: F-015, F-016 (extend calendar adapter pattern)
- Approval: Pending
```

---

**Document Status:** ✅ Complete  
**Next Review:** After M-REQ approval (2026-01-12)
