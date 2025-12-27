# Console.log Migration - Follow-up Tasks

## Status: Critical Paths Complete ✅

All console.log calls in critical paths (money, auth, ops) have been migrated to the centralized logger.

**Completed:**
- ✅ Jarvis core libs (40 calls)
- ✅ Critical services (51 calls) 
- ✅ Critical API routes (48 calls)
- **Total: ~139 critical calls migrated**

**Remaining:**
- ~612 calls in admin/dev/analytics API routes (lower priority)
- ~200+ calls in UI components (visualization, admin dashboards)

---

## Follow-up A: ESLint Rule (Prevent Regression) ✅ COMPLETE

**Goal:** Prevent new console.log calls from being added to critical paths.

**Status:** ✅ Implemented in `eslint.config.mjs`

**Implementation:**
- Error-level ban on `console.log` in `src/lib/**/*` and `src/app/api/**/*`
- Allows `console.warn` and `console.error` (used by logger implementation)
- Warning-level for UI components (`src/components/**/*`, `src/app/**/*.tsx`)
- API routes excluded from component warning rule to avoid conflicts

**Why:** Prevents regression without requiring a full migration sprint for non-critical paths.

---

## Follow-up B: Opportunistic Cleanup ✅ INITIAL PASS COMPLETE

**Strategy:** Replace console.log calls when touching admin/analytics files for other reasons.

**Status:** ✅ Initial opportunistic cleanup completed

**Completed in this pass:**
- ✅ `src/app/api/analytics/track/route.ts` - Replaced alert console.log with logger.warn
- ✅ `src/app/api/analytics/heatmap/route.ts` - Replaced fallback console.log with logger.debug
- ✅ `src/app/admin/layout.tsx` - Replaced 2 debug console.log calls with logger.debug
- ✅ `src/app/admin/dashboard/page.tsx` - Replaced debug console.log with logger.debug

**Approach:**
- No dedicated migration sprint
- When modifying a file that has console.log, migrate it as part of that change
- Keeps momentum without distraction
- Natural code cleanup over time

**Remaining files to target opportunistically:**
- `src/app/api/admin/**` (~200 calls)
- `src/app/api/analytics/**` (~48 remaining calls)
- `src/app/api/(dev)/**` (~100 calls)
- `src/components/**` (~200+ calls)

---

## Notes

- Logger foundation is complete and ready
- All critical paths are production-ready
- Remaining calls are in non-critical paths (admin dashboards, dev tools, analytics)
- Type checks pass ✅
- Ready for production observability ✅

