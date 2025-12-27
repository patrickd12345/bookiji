# Jarvis Phase 5: Adaptive Policy + Simulation + Safe Suggestions

## Overview

Phase 5 enables Jarvis to:
1. **Replay past incidents** under alternate policies (simulation)
2. **Compute metrics** comparing "current policy" vs "candidate policy"
3. **Generate deterministic, rule-based suggestions** to improve alerting (advisory only)
4. **Provide a human approval workflow** to apply policy changes safely
5. **Preserve invariants**: no spam, caps respected, ACK gates respected, quiet-hours enforced

## Safety Constraints

**CRITICAL**: This is a safety-critical phase. The system may become "smarter," but must NEVER become "creative."

- ❌ **NO LLM** for decisions, explanations, or policy changes
- ❌ **NO auto-apply** of policy changes - humans must explicitly approve
- ❌ **NO changes** to production decision logic to incorporate learned behavior
- ✅ Production decisions remain **deterministic and traceable** (Phase 4 guarantees still apply)
- ✅ All adaptive outputs must be **reproducible** from stored data and code version
- ✅ New capabilities guarded by **feature flags** and default OFF in production

## Architecture

### 1. Policy Definition Layer

**Location**: `src/lib/jarvis/policy/`

- **Types** (`types.ts`): Policy configuration structure
- **Registry** (`registry.ts`): Policy storage and retrieval
- **Adapter** (`adapter.ts`): Converts PolicyConfig to SleepPolicy format for backward compatibility

**Database Schema**: `supabase/migrations/20251229000000_jarvis_phase5_policies.sql`

- `jarvis_policies` table: Versioned policy storage
- `jarvis_policy_changes` table: Approval workflow tracking
- Only ONE ACTIVE policy at a time (enforced by unique constraint)

**Policy JSON Structure**:
```json
{
  "notification_cap": 5,  // MUST be <= 5 (invariant)
  "quiet_hours": {
    "start": "22:00",
    "end": "07:00",
    "timezone": "America/New_York"
  },
  "severity_rules": {
    "SEV-1": {
      "allowed_channels": ["sms"],
      "wake_during_quiet_hours": true,
      "max_silent_minutes": 120,
      "escalation_intervals_minutes": [15, 30, 60, 120]
    },
    "SEV-2": { ... },
    "SEV-3": { ... }
  }
}
```

### 2. Simulation Engine

**Location**: `src/lib/jarvis/simulation/engine.ts`

- `simulateIncident(incidentId, candidatePolicyId)`: Replay single incident
- `simulateIncidents(timeRange, candidatePolicyId)`: Batch simulation

**Features**:
- Deterministic replay of incident timelines
- Compares baseline vs simulated decisions
- Safety checks (caps, quiet-hours, ACK gating)
- No external calls, no randomness, no LLMs

### 3. Suggestion Engine

**Location**: `src/lib/jarvis/suggestions/engine.ts`

- `generatePolicySuggestions(timeRange)`: Generate rule-based suggestions

**Suggestion Types**:
1. Reduce quiet hours notifications for SEV-2 (if high ACK rates)
2. Lower notification cap (if rarely reached, no missed ACKs)
3. Add batching window (if rapid notifications)
4. Increase severity mapping (if repeated manual escalations)
5. Change channel ordering (if multiple channels exist)

**Rules**:
- Suggestions are **deterministic** and **reproducible**
- Based on historical metrics only
- Include risk flags and required approvals
- NEVER directly change ACTIVE policy

### 4. Approval Workflow

**Location**: `src/lib/jarvis/policy/workflow.ts`

**API Endpoints**:
- `POST /api/jarvis/policies`: Create DRAFT policy
- `POST /api/jarvis/policies/:id/simulate`: Run simulation
- `POST /api/jarvis/policies/:id/suggestions`: Generate suggestions
- `POST /api/jarvis/policies/:id/approve`: Approve change (admin-only)
- `POST /api/jarvis/policies/:id/activate`: Activate approved policy (admin-only)

**Workflow**:
1. Create DRAFT policy
2. Simulate over time window
3. Generate suggestions (optional)
4. Approve change (admin)
5. Activate policy (atomic: deactivate old, activate new)

### 5. Phase 5 Invariants

**Location**: `scripts/check-jarvis-phase5-invariants.mjs`

**CI Checks**:
1. ✅ `notification_cap` in any ACTIVE policy <= 5
2. ✅ ACTIVE policy has required keys in `policy_json`
3. ✅ Production decisions log `policy_id`/`version`/`checksum` in trace (if Phase 5 enabled)
4. ✅ No policy activated without approval

**CI Integration**: `.github/workflows/invariants-check.yml`

## Feature Flags

Phase 5 modules are guarded by feature flags (default OFF):

- `JARVIS_PHASE5_SIMULATION_ENABLED`: Enable simulation engine
- `JARVIS_PHASE5_SUGGESTIONS_ENABLED`: Enable suggestion engine

**Default**: Both flags are `false` in production. Enable explicitly when ready.

## Decision Engine Changes

**Location**: `src/lib/jarvis/escalation/decideNextAction.ts`

- Now accepts optional `policy` parameter for simulation
- If not provided, loads ACTIVE policy from database
- Decision traces include `policy_id`, `policy_version`, `policy_checksum` (Phase 5)

**Backward Compatibility**:
- Falls back to `OWNER_DEFAULT_V1` if no ACTIVE policy exists
- Policy metadata in traces is optional (backward compatible)

## Database Migrations

1. **20251229000000_jarvis_phase5_policies.sql**: Creates policy tables
2. **20251229000001_jarvis_phase5_seed_default_policy.sql**: Seeds default policy

## Testing

**Test Files**:
- `src/lib/jarvis/policy/registry.test.ts`: Policy validation tests
- `src/lib/jarvis/suggestions/engine.test.ts`: Suggestion engine tests
- `src/lib/jarvis/escalation/decideNextAction.test.ts`: Updated for async policy loading

**Test Coverage**:
- Policy schema validation
- Simulation correctness
- Suggestion determinism
- Approval workflow
- Regression: all existing Jarvis tests still pass

## Usage Examples

### Create a DRAFT Policy

```typescript
const policy = await createPolicy(
  'MY_POLICY_V1',
  'My Policy',
  '1.0.0',
  policyConfig,
  'user_id',
  'Description'
)
```

### Simulate Incidents

```typescript
const result = await simulateIncidents(
  { start: '2025-01-01', end: '2025-01-31' },
  policyId
)
```

### Generate Suggestions

```typescript
const suggestions = await generatePolicySuggestions({
  start: '2025-01-01',
  end: '2025-01-31'
})
```

### Approve and Activate

```typescript
// Approve
await approvePolicyChange(changeId, 'admin_user_id')

// Activate (atomic)
await activatePolicyChange(changeId, 'admin_user_id')
```

## Exit Criteria

✅ All deliverables completed:
- [x] Policy definition layer (config, versioned)
- [x] Simulation engine (replay mode)
- [x] Suggestion engine (advisory only, rule-based)
- [x] Approval workflow (human-in-the-loop)
- [x] Phase 5 invariants (CI enforced)
- [x] Tests (comprehensive)

✅ Safety guarantees:
- [x] Production decisions remain deterministic
- [x] No LLM usage
- [x] No auto-apply
- [x] Feature flags default OFF
- [x] Invariants enforced (cap <= 5, approval required)

## Future Enhancements

- Stored procedure for atomic policy activation
- More sophisticated suggestion rules
- Policy versioning and rollback
- Policy A/B testing framework
