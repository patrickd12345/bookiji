# Release Confidence & Proof

This document defines what requires proof before production and what "proof" means.

## What Is a Release?

A release is any change that affects production:
- **Code**: Application code deployment
- **Config**: Environment variables, feature flags
- **Schema**: Database migrations
- **Policy**: Escalation policies, guardrails

## What Requires Proof?

Proof is required for:
- Any change to scheduling flow
- Any change to payment processing
- Any change to guardrails or kill switches
- Any change to incident detection or escalation
- Any database schema change affecting bookings or payments

**Do NOT require proof for:**
- Documentation-only changes
- UI-only changes (no logic changes)
- Test changes
- Development tooling

## What Is Proof?

Proof is:
- **Deterministic**: Same inputs produce same outputs
- **Repeatable**: Can be run multiple times with identical results
- **Observable**: Produces artifacts (logs, traces, reports) that can be reviewed

Proof is **NOT**:
- Risk scoring
- Prediction
- Judgment
- Interpretation

Proof is binary: PASS or FAIL.

## Proof Examples

### Example 1: Scheduling Flow Proof

**What to prove**: Booking creation flow works end-to-end.

**How to prove**:
1. Run booking creation test suite
2. Verify all tests pass
3. Review test output for deterministic results
4. Check that no flaky tests exist

**Artifact**: Test report showing 100% pass rate.

**PASS criteria**: All tests pass, no flaky tests.

**FAIL criteria**: Any test fails or is flaky.

---

### Example 2: Payment Path Proof

**What to prove**: Payment processing path works correctly.

**How to prove**:
1. Run payment integration tests
2. Verify Stripe webhook handling
3. Check payment state machine transitions
4. Validate refund logic

**Artifact**: Test report and payment flow trace.

**PASS criteria**: All payment tests pass, state transitions valid.

**FAIL criteria**: Any payment test fails, invalid state transitions.

---

### Example 3: Guardrail Proof

**What to prove**: Guardrails activate and deactivate correctly.

**How to prove**:
1. Run guardrail activation tests
2. Verify kill switch behavior
3. Check notification cap enforcement
4. Validate quiet hours logic

**Artifact**: Test report showing guardrail behavior.

**PASS criteria**: All guardrail tests pass, behavior matches specification.

**FAIL criteria**: Any guardrail test fails, behavior deviates from spec.

---

## Non-Goals

Proof does **NOT**:
- Judge if a change is "good" or "bad"
- Score risk levels
- Predict future behavior
- Interpret results

Proof only answers: "Does this work as specified?"

## When Proof Is Required

Proof must be run:
- Before any production deployment
- After any schema migration
- After any policy change
- When rollback is being considered (to verify rollback target)

Proof is **NOT** required:
- For staging deployments (unless testing production-like behavior)
- For development environments
- For documentation changes

## Failure Handling

If proof fails:
1. **STOP**: Do not proceed to production
2. **Document**: Record failure in Operations Changelog
3. **Fix**: Address the failure
4. **Re-run**: Run proof again until PASS
5. **Rollback**: If already in production, see ROLLBACKS.md

Do not proceed with a FAIL result.




