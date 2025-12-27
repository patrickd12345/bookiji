# Jarvis Phase 5 Enablement Plan

**Last Updated:** January 27, 2025  
**Status:** Phase 5 Built, Not Enabled  
**Critical:** Do not enable Phase 5 until all gates are met

## Overview

Phase 5 (Policy Learning & Suggestions) has been built correctly. However, **it must not be enabled until we earn the right to turn it on**. This document defines the enablement gates and rollout plan.

## ⛔ Current Status

**Phase 5 is DISABLED by default.**

- `JARVIS_PHASE5_SIMULATION_ENABLED=false` (default)
- No suggestions generated
- No UI pressure
- Manual policy activation only

## 🚪 Enablement Gates (ALL Required)

### Gate 1 — Clean Baseline (Mandatory)

**Status:** ✅ In Progress

**Requirements:**
- [x] P1.2: XSS audit & sanitization complete
- [x] P1.3: SLOs defined & monitored
- [x] P1.1: Logger foundation in place
- [ ] P1.1: Console.log migration complete (1,391 calls remaining)
- [ ] P1.5: Environment variable validation complete

**If this is not done → Phase 5 stays OFF.**

**Rationale:** Phase 5 suggestions must be built on a stable, secure foundation. We cannot learn from noisy or insecure data.

---

### Gate 2 — Data Maturity (Minimum 30 days)

**Status:** ⏳ Waiting for Gate 1

**Requirements:**
- **Minimum dataset:**
  - ≥ 100 real incidents
  - ≥ 30 days of Jarvis telemetry
  - Stable ACK patterns observed

**Why:** No data = no learning. Suggestions based on insufficient data are worse than no suggestions.

**Measurement:**
```sql
-- Check incident count
SELECT COUNT(*) FROM jarvis_incidents WHERE created_at > NOW() - INTERVAL '30 days';

-- Check telemetry coverage
SELECT 
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as incidents
FROM jarvis_incidents
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day;
```

**Acceptance Criteria:**
- At least 100 incidents in last 30 days
- No gaps > 7 days in incident data
- ACK rate > 50% (shows engagement)

---

### Gate 3 — Simulation Dry Runs (No Prod Impact)

**Status:** ⏳ Waiting for Gate 2

**Requirements:**
- Run simulation against last 30–60 days of real incidents
- Verify:
  - ✅ No invariant violations
  - ✅ No increased missed ACKs
  - ✅ Caps always respected
  - ✅ Quiet hours always respected

**Simulation Must Prove:**
> "This policy is safer or quieter without regressions."

**How to Run:**
```bash
# Enable simulation only (no suggestions, no activation)
JARVIS_PHASE5_SIMULATION_ENABLED=true pnpm dev

# Run simulation against historical data
# (Implementation: Use jarvis simulation engine with real incident data)
```

**Acceptance Criteria:**
- Simulation report shows 0 invariant violations
- ACK rate in simulation ≥ baseline ACK rate
- Notification count in simulation ≤ baseline notification count
- All caps respected in 100% of simulated decisions

---

### Gate 4 — Human Review Loop

**Status:** ⏳ Waiting for Gate 3

**Requirements:**
Before activation:
- [ ] Simulation report reviewed by human
- [ ] Suggested policy diff understood
- [ ] Explicit approval recorded (audit trail)
- [ ] No "trust me" deploys

**Review Checklist:**
- [ ] What changed in the suggested policy?
- [ ] Why did the system suggest this change?
- [ ] What are the risks?
- [ ] What are the expected benefits?
- [ ] Have we tested this in simulation?

**Approval Process:**
1. Simulation report generated
2. Human reviews report
3. Human approves or rejects
4. Approval recorded in audit log
5. If approved: Policy activated manually (not automatically)

---

## 🚀 Phase 5 Rollout Order

### Step 1: Enable SIMULATION Only ✅

**Command:**
```bash
JARVIS_PHASE5_SIMULATION_ENABLED=true
```

**What This Does:**
- Runs policy simulation against real incidents
- Generates policy suggestions
- **No suggestions shown to humans**
- **No UI pressure**
- **No activation allowed**

**Duration:** Minimum 7 days of observation

**Success Criteria:**
- Simulation runs without errors
- No invariant violations in simulation
- Simulation data matches real incident patterns

---

### Step 2: Enable SUGGESTIONS (Read-Only)

**Command:**
```bash
JARVIS_PHASE5_SIMULATION_ENABLED=true
JARVIS_PHASE5_SUGGESTIONS_ENABLED=true
```

**What This Does:**
- Shows policy suggestions in admin UI
- Allows humans to review suggestions
- **Still no activation allowed**
- **Humans observe patterns**

**Duration:** Minimum 14 days of observation

**Success Criteria:**
- Suggestions appear reasonable to humans
- No suggestion violates invariants
- Humans understand why suggestions were made

---

### Step 3: Manual Activation Only ⛔

**Command:**
```bash
# Still no automatic activation
# Activation remains manual forever
```

**What This Does:**
- Humans can manually activate suggested policies
- Each activation requires explicit approval
- Audit trail records all activations

**This is a feature, not a weakness.**

**Why Manual Forever:**
- Policy changes affect real notifications
- We want human judgment in the loop
- Automation is for suggestions, not decisions

---

## 📊 Monitoring During Rollout

### Metrics to Track

1. **Invariant Violations**
   - Target: 0
   - Alert: Any non-zero

2. **ACK Rate**
   - Baseline: Current ACK rate
   - Target: ≥ Baseline
   - Alert: < Baseline - 10%

3. **Notification Count**
   - Baseline: Current notification count per incident
   - Target: ≤ Baseline
   - Alert: > Baseline + 20%

4. **Decision Latency**
   - Target: p99 < 250ms (unchanged)
   - Alert: p99 > 500ms

### Dashboard

Monitor these metrics in real-time during rollout:
- `/admin/jarvis/policies` - Policy status
- `/admin/jarvis/suggestions` - Active suggestions
- `/admin/jarvis/simulation` - Simulation results

---

## 🛑 Rollback Plan

If any of the following occur, **immediately disable Phase 5:**

1. **Invariant violation detected**
   - Disable: `JARVIS_PHASE5_SIMULATION_ENABLED=false`
   - Revert to default policy
   - Investigate root cause

2. **ACK rate drops significantly**
   - Disable suggestions
   - Review policy changes
   - Revert if necessary

3. **Notification count increases unexpectedly**
   - Disable suggestions
   - Review policy changes
   - Revert if necessary

4. **Decision latency degrades**
   - Disable simulation
   - Investigate performance impact
   - Fix before re-enabling

---

## 📝 Decision Log

Record all Phase 5 enablement decisions:

| Date | Gate | Decision | Reason | Approved By |
|------|------|----------|--------|-------------|
| TBD | Gate 1 | Pending | Waiting for console.log migration | - |
| TBD | Gate 2 | Pending | Waiting for 30 days of data | - |
| TBD | Gate 3 | Pending | Waiting for simulation dry runs | - |
| TBD | Gate 4 | Pending | Waiting for human review | - |

---

## 🎯 Success Criteria

Phase 5 is successful when:

1. ✅ All gates passed
2. ✅ Simulation shows improvements (safer or quieter)
3. ✅ Suggestions are reasonable and understood
4. ✅ Manual activation works correctly
5. ✅ No regressions in ACK rate or notification count
6. ✅ Zero invariant violations

---

## Related Documentation

- `docs/development/JARVIS_INCIDENT_COMMANDER.md` - Jarvis system overview
- `docs/operations/SLO.md` - SLO definitions including Jarvis SLOs
- `src/lib/jarvis/policy/` - Phase 5 implementation
- `src/lib/jarvis/escalation/` - Escalation decision engine

---

## ⚠️ Critical Reminder

**Do not enable Phase 5 until all gates are met.**

Building it correctly was the easy part. Earning the right to use it is the hard part. Take the time to do it right.

