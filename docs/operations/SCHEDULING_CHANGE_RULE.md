# Scheduling Change Rule (Invariant Protection)

## Non-Negotiable Rule

**Any change that touches any of the following:**
- `bookings` table or related logic
- `payments` / `stripe_payment_intent_id` / payment processing
- `availability_slots` / slot management
- Time / timezone logic
- Booking state transitions
- Payment webhook handling

**MUST rerun:**
- ✅ SimCity Phase 1 — Atomic Slot Invariant
- ✅ SimCity Phase 2 — Payment ↔ Booking Consistency

**Before:**
- Merge to `main`
- Deploy to `staging`
- Deploy to `production`

**No exceptions.**

If phases fail, deployment is **blocked**.

## Why This Matters

Bookiji Scheduling was certified as a market-entry product on **2025-12-26** (tag: `scheduling-certified-v1`). This certification proves that the system maintains critical invariants under adversarial conditions.

**Breaking these invariants = breaking the certification.**

## How to Verify

### Manual Verification

Run the certification script:

```bash
DEPLOY_ENV=test SIMCITY_ALLOWED_ENVS=test,staging,recovery pnpm exec tsx scripts/adversarial-certification.ts
```

**Required:** Phases 1 and 2 must PASS.

### PR Checklist

When opening a PR that touches scheduling/payments/slots/time:

- [ ] I touched scheduling / payments / slots / time
- [ ] SimCity Phase 1 rerun: ✅ PASS
- [ ] SimCity Phase 2 rerun: ✅ PASS
- [ ] Evidence attached (screenshot or log output)

### CI Gate (Future)

A CI gate will be added to automatically block merges if:
- Files in `src/app/api/bookings/**` are modified
- Files in `src/app/api/webhooks/stripe/**` are modified
- Files in `src/app/api/payments/**` are modified
- Migrations touching `bookings`, `availability_slots`, or payment-related tables
- Phases 1 or 2 fail

## Protected Invariants

### Phase 1: Atomic Slot Invariant
- **Invariant:** One availability slot can result in at most one confirmed booking
- **Test:** 10 concurrent booking attempts on a single slot
- **Pass Condition:** Exactly 1 successful booking, all others fail deterministically

### Phase 2: Payment ↔ Booking Consistency
- **Invariant:** A confirmed booking and payment decision are never out of sync
- **Test:** Interrupted redirects, duplicate webhooks, reordered webhooks
- **Pass Condition:** No orphan payments, no zombie bookings, ledger reconciles exactly

## Enforcement

### CI Enforcement
**Phase 1 and Phase 2 are executed automatically on every relevant PR.**

The CI workflow (`.github/workflows/scheduling-certification-check.yml`) runs automatically when PRs touch:
- `src/app/api/bookings/**`
- `src/app/api/webhooks/stripe/**`
- `src/app/api/payments/**`
- `src/lib/guards/**`
- `supabase/migrations/**`
- `scripts/adversarial-certification.ts`

**Current State:** Warning mode (non-blocking)
- Failures are reported but do not block merge
- Review output in PR checks

**Upgrade to Hard Gate:**
1. Mark workflow as "required" in GitHub branch protection settings
2. Invariant failures will block merge
3. See workflow file comments for details

### Code Review
- Reviewers must verify SimCity phases passed
- If phases not run, request evidence before approval
- Check CI output for phase results

### Deployment
- Staging deployment blocked if phases fail
- Production deployment blocked if phases fail
- Rollback required if post-deployment phase failure detected

### Monitoring
- Post-deployment: Monitor for invariant violations
- Alert on: Confirmed bookings without payment, duplicate slot bookings, past slot bookings

## Exceptions

**There are no exceptions.**

If you need to change scheduling/payment logic:
1. Make the change
2. Run SimCity Phases 1 & 2
3. Fix any violations
4. Re-run until PASS
5. Then merge/deploy

## Related Documentation

- **Certification Report:** `certification/scheduling-certification-v1.md`
- **Certification Metadata:** `certification/scheduling-certification-v1.meta.json`
- **Test Script:** `scripts/adversarial-certification.ts`
- **State Machine:** `docs/development/BOOKING_STATE_MACHINE.md`
- **Payment Fix:** `docs/development/PAYMENT_CONSISTENCY_FIX.md`

## Questions?

If you're unsure whether your change requires verification:
- **Default to YES** — run the phases
- Ask in #engineering or #reliability
- Better safe than sorry

---

**Last Updated:** 2025-12-26  
**Certification Tag:** `scheduling-certified-v1`  
**Authority:** Reliability Engineering

