# SimCity v1 Architecture

**Version:** 1.0  
**Status:** FROZEN  
**Effective Date:** 2024  
**Scope:** Phases 1-10

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Design Principles](#design-principles)
3. [System Overview](#system-overview)
4. [End-to-End Pipeline](#end-to-end-pipeline)
5. [Deterministic Kernel](#deterministic-kernel)
6. [Event System](#event-system)
7. [Proposal Generation](#proposal-generation)
8. [Replay System (Phase 5)](#replay-system-phase-5)
9. [Metrics and Dials (Phase 6)](#metrics-and-dials-phase-6)
10. [Governance Engine (Phase 7)](#governance-engine-phase-7)
11. [Cockpit UI (Phase 8)](#cockpit-ui-phase-8)
12. [Human Overrides (Phase 9)](#human-overrides-phase-9)
13. [Production Shadow Mode (Phase 10)](#production-shadow-mode-phase-10)
14. [Hashing and Determinism](#hashing-and-determinism)
15. [Safety Guards](#safety-guards)
16. [API Surface](#api-surface)
17. [Invariants](#invariants)
18. [Known Limitations](#known-limitations)
19. [Extension Points (v2+)](#extension-points-v2)
20. [Glossary](#glossary)

---

## Executive Summary

SimCity v1 is a deterministic simulation and governance system designed to evaluate operational changes in a controlled, observable environment. The system operates in advisory capacity: it produces promotion decisions but does not enforce them. All decisions are hash-stable, traceable, and auditable.

**Core Value Proposition:**
- Deterministic simulation engine with reproducible results
- Governance rules evaluate proposals against dials and metrics
- Human override capability with cryptographic audit trail
- Production shadow mode for observation without side effects
- Read-only visualization cockpit for decision transparency

**Architectural Contract:**
SimCity v1 makes no functional or behavioral changes to production systems. It is purely observational and advisory.

---

## Design Principles

### 1. Fail-Closed

When any component fails or encounters uncertainty, the system defaults to the safest state:
- Missing dials → BLOCK verdict
- Invalid proposals → BLOCK verdict
- Hash mismatch → rejection
- Validation failure → error, no partial state

### 2. Advisory Before Authority

SimCity v1 produces decisions but does not execute them. All decisions are:
- Observable through the cockpit
- Overrideable by humans (Phase 9)
- Traceable through cryptographic hashes
- Never directly applied to production

### 3. Deterministic Kernel

The core simulation and evaluation engine is fully deterministic:
- Same inputs → same outputs (bit-for-bit)
- Seed-based event generation
- Deterministic metrics computation
- Stable hashing for all decisions

### 4. Hash-Stable Decisions

Every decision includes cryptographic hashes:
- `inputsHash`: hash of evaluation inputs (proposal, dials, context)
- `decisionHash`: hash of decision content (verdict, reasons, overrides)
- `overrideHash`: hash of override record (Phase 9)
- `reportHash`: hash of replay/shadow reports

Hashes enable:
- Verification of decision integrity
- Detection of input changes
- Audit trail construction
- Cross-system decision correlation

### 5. Append-Only Audit Trail

Historical state is never modified:
- Overrides are appended, never updated or deleted
- Decisions are immutable once issued
- Replay results are stored, not recalculated on demand
- All timestamps are ISO 8601, injected once at creation

### 6. Read-Only Visualization

The cockpit (Phase 8) displays data but does not influence decisions:
- No threshold configuration in UI
- No business logic in presentation layer
- No aggregation beyond API-provided data
- No override execution (Phase 9 action is separate)

---

## System Overview

### Components

1. **Simulation Engine**: Generates synthetic events and maintains system state
2. **Proposal Generator**: Creates candidate actions based on events and rules
3. **Metrics Extractor**: Computes metrics from event streams
4. **Dial Evaluator**: Classifies metrics into green/yellow/red zones
5. **Governance Engine**: Evaluates proposals against governance rules
6. **Override Store**: Appends human override records (Phase 9)
7. **Replay Engine**: Re-simulates scenarios with interventions (Phase 5)
8. **Shadow Collector**: Observes production events without side effects (Phase 10)
9. **Cockpit UI**: Visualizes decisions and system state (Phase 8)

### Control Plane Boundaries

**In Scope (v1):**
- Synthetic event generation
- Proposal evaluation
- Metrics computation
- Governance rule application
- Human override recording
- Production event observation (shadow mode)
- Decision visualization

**Out of Scope (v1):**
- Production system modification
- Override enforcement/execution
- Persistent storage (in-memory only)
- Real-time production integration
- Proposal execution

---

## End-to-End Pipeline

### Phase Flow

```
1. Simulation Start
   ↓
2. Event Generation (synthetic or shadow)
   ↓
3. Proposal Generation (Phase 4)
   ↓
4. Metrics Extraction (Phase 6)
   ↓
5. Dial Evaluation (Phase 6)
   ↓
6. Governance Evaluation (Phase 7)
   ↓
7. Decision Output (allow/warn/block)
   ↓
8. Human Override (Phase 9, optional)
   ↓
9. Visualization (Phase 8, read-only)
```

### Key Transitions

**Event → Proposal:**
- Events trigger proposal generation rules
- Proposals include: ID, domain, action, confidence, evidence

**Proposal → Decision:**
- Governance engine evaluates proposal against dials
- Produces: verdict, reasons, required overrides, hashes

**Decision → Override (optional):**
- Human reviews decision
- Creates override record with justification
- Original decision remains intact and visible

**Shadow Mode:**
- Production events collected (Phase 10)
- Simulated in SimCity engine
- Hypothetical verdict computed
- No production impact

---

## Deterministic Kernel

### Seed-Based Execution

All simulation state derives from a seed:
- Event generation uses seeded PRNG
- Event IDs are deterministic from seed + tick + domain + type
- Replay uses same seed to reproduce baseline

### State Management

**Immutable Events:**
- Events are append-only to event buffer
- Events include: ID, tick, domain, type, payload
- Events wrapped in envelopes with seed and generation tick

**Tick-Based Progression:**
- System advances by discrete ticks
- Each tick processes events generated at that tick
- Metrics computed from event buffer up to current tick

### Reproducibility Guarantees

Given:
- Same seed
- Same tick range
- Same configuration

Then:
- Same events generated
- Same metrics computed
- Same dial classifications
- Same governance decisions
- Same hashes

---

## Event System

### Event Types

**Domain Signals:**
- Synthetic events representing system state changes
- Examples: booking.created, capacity.utilized, trust.violated

**Proposal Events:**
- `proposal.generated`: indicates a candidate action was created
- Contains: proposal ID, domain, action, confidence, evidence

**Shadow Events (Phase 10):**
- Production events observed for shadow simulation
- Format: source: 'production', timestamp, domainEvent

### Event Structure

```typescript
SimCityEventEnvelope {
  version: 1
  seed: number
  generatedAtTick: number
  event: {
    id: string          // deterministic hash
    tick: number
    domain: string
    type: string
    payload: Record<string, unknown>
  }
}
```

### Event Lifecycle

1. Generation: seeded PRNG produces event spec
2. Wrapping: event wrapped in envelope with metadata
3. Storage: appended to in-memory event buffer
4. Processing: metrics extractors consume events
5. Archival: events retained for replay and audit

---

## Proposal Generation

### Proposal Sources

**LLM-Based (Phase 4):**
- Language model analyzes events and suggests actions
- Proposals include confidence scores
- Evidence linked to source events

**Rules-Based:**
- Deterministic rules evaluate conditions
- Trigger actions based on event patterns
- Fully reproducible

**Hybrid Mode:**
- Combination of LLM and rules
- Configurable per domain

### Proposal Structure

```typescript
SimCityProposal {
  id: string
  tick: number
  domain: string
  action: string
  description: string
  confidence: number        // 0.0 - 1.0
  evidenceEventIds: string[]
  source: 'llm' | 'rules'
}
```

### Proposal Lifecycle

1. Generation: triggered by events or tick progression
2. Validation: checked against configuration and constraints
3. Storage: added to proposal list
4. Evaluation: governance engine processes proposal
5. Decision: verdict assigned based on governance rules

---

## Replay System (Phase 5)

### Purpose

Replay enables "what-if" analysis by re-simulating scenarios with different interventions.

### Replay Request

```typescript
SimCityReplayRequest {
  fromTick: number
  toTick: number
  baseline?: boolean              // include baseline replay
  variants?: Array<{
    name: string
    interventions: SimCityInterventionPlan[]
  }>
  filters?: {
    domains?: string[]
    eventTypes?: string[]
  }
}
```

### Replay Execution

1. **Baseline Replay:**
   - Re-simulates tick range with same seed
   - No interventions applied
   - Produces baseline metrics and events

2. **Variant Replay:**
   - Re-simulates with interventions at specified ticks
   - Interventions: proposals to apply or actions to take
   - Produces variant metrics and events

3. **Diff Computation:**
   - Compares baseline vs variant
   - Event diffs: counts by domain/type
   - Metric deltas: value differences

4. **Report Generation:**
   - Markdown summary of changes
   - Deterministic reportHash
   - Stored for later retrieval

### Replay Guarantees

- Deterministic: same inputs → same outputs
- Isolated: replay does not affect live simulation
- Immutable: reports never recalculated, only stored

---

## Metrics and Dials (Phase 6)

### Metrics Registry

All metrics are defined in a canonical registry:

```typescript
MetricDefinition {
  id: MetricId
  domain: string
  description: string
  unit: string                           // 'ratio' | 'ms'
  direction: 'higher-is-better' | 'lower-is-better'
}
```

**Canonical Metrics (v1):**
- `booking.success_rate` (higher-is-better, ratio)
- `booking.drop_rate` (lower-is-better, ratio)
- `capacity.utilization` (lower-is-better, ratio)
- `trust.violation_rate` (lower-is-better, ratio)
- `latency.p95` (lower-is-better, ms)
- `error.rate` (lower-is-better, ratio)

### Metrics Extraction

Metrics are computed from event streams:
- Extractor functions consume events
- Aggregate values across time windows
- Produce numeric values per metric ID

### Dial Definitions

Dials define threshold zones for metrics:

```typescript
DialDefinition {
  metric: MetricId
  green: [number, number]        // acceptable range
  yellow: [number, number]       // warning range
  red: [number, number]          // critical range
}
```

**Zone Classification:**
- For `higher-is-better`: green = highest range
- For `lower-is-better`: green = lowest range
- Zones must be non-overlapping
- Zones must cover plausible value space

### Dial Status

```typescript
DialStatus {
  metric: MetricId
  value: number
  zone: 'green' | 'yellow' | 'red'
}
```

Dial evaluation is deterministic: same metrics → same dial statuses.

---

## Governance Engine (Phase 7)

### Governance Rules

Rules are applied in deterministic order:

1. **Block on Red Dials:**
   - If any dial is red → BLOCK verdict
   - Adds reason with dial details

2. **Warn on Yellow Dials:**
   - If any dial is yellow → WARN verdict (if not already BLOCK)
   - Adds warning reason

3. **Additional Rules:**
   - Extensible rule set
   - Each rule may produce: verdict escalation, reason, override requirement

### Governance Context

```typescript
GovernanceContext {
  tick: number
  proposal: SimCityProposal
  dialsSnapshot: DialStatus[]
  replayEvaluation?: {
    base?: EvaluationResult
    variant?: EvaluationResult
    deltas?: MetricDelta[]
  }
  replayReportSummary?: {
    reportHash: string
    markdownSummary?: string
  }
}
```

### Promotion Decision

```typescript
PromotionDecision {
  proposalId: string
  domain: string
  action: string
  verdict: 'allow' | 'warn' | 'block'
  reasons: GovernanceReason[]
  requiredOverrides?: OverrideRequirement[]
  evaluatedAtTick: number
  inputsHash: string              // hash of evaluation inputs
  decisionHash: string            // hash of decision content
}
```

### Governance Reasons

```typescript
GovernanceReason {
  ruleId: string                  // stable rule identifier
  severity: 'info' | 'warn' | 'block'
  message: string
  evidence?: Record<string, unknown>
}
```

Reasons provide traceable justification for verdicts.

### Override Requirements

```typescript
OverrideRequirement {
  reason: string
  roleRequired: 'admin' | 'safety' | 'exec'
  expiresAfterTicks?: number
}
```

If governance determines an override is needed, it specifies:
- Why override is required
- Minimum role level needed
- Optional expiration (in ticks)

---

## Cockpit UI (Phase 8)

### Design Contract

**The cockpit is a lens, not a brain:**
- Displays data from APIs
- No business logic in UI
- No threshold configuration
- No aggregation beyond API data
- No override execution (Phase 9 action is separate)

### Views

**1. Overview:**
- Global verdict (aggregate of all proposals)
- Verdict counts (allow/warn/block)
- Latest decision hash and inputs hash
- System information (tick, proposal count)

**2. Proposals:**
- Table of all proposals
- Columns: ID, Verdict, Reasons, Override Required, Decision Hash
- Sortable by ID (deterministic)
- Links to proposal detail

**3. Proposal Detail:**
- Header: Proposal ID, Verdict, Hashes
- Governance Reasons: all rules that contributed
- Overrides: required override specifications (read-only)
- Metrics Snapshot: baseline vs candidate values
- Timeline: machine decision + human overrides

**4. Metrics & Dials:**
- All 6 dials with current zones
- Threshold ranges displayed (read-only)
- Complete metrics registry
- Current values and directions

**5. Replays & Diffs:**
- List of replay runs
- Diff summaries (event and metric deltas)
- Markdown reports
- Shadow mode tab (Phase 10)

### Data Flow

```
API (Phase 7)
   ↓
Server Component (Next.js)
   ↓
Pure UI Components
```

All data fetched server-side. No client-side state mutations.

---

## Human Overrides (Phase 9)

### Purpose

Enable humans to override machine decisions while maintaining full audit trail.

### Override Record

```typescript
OverrideRecord {
  overrideId: string              // UUID
  proposalId: string
  decisionHash: string            // links to original decision
  verdictBefore: OverrideVerdict  // 'ALLOW' | 'WARN' | 'BLOCK'
  verdictAfter: OverrideVerdict
  actor: {
    userId: string
    role: string                  // 'admin' | 'safety' | 'exec'
  }
  justification: string           // required, non-empty
  timestamp: string               // ISO 8601, injected once
  overrideHash: string            // hash of record (excluding overrideHash)
}
```

### Validation Rules

Override creation requires:

1. **Decision requires override:**
   - `decision.requiredOverrides` must not be empty
   - Otherwise: `OVERRIDE_NOT_ALLOWED` error

2. **Justification provided:**
   - `justification` must be non-empty after trimming
   - Otherwise: `JUSTIFICATION_REQUIRED` error

3. **Sufficient role:**
   - Actor role must match at least one `requiredOverrides[].roleRequired`
   - Otherwise: `INSUFFICIENT_ROLE` error

4. **Hash match:**
   - `decisionHash` must match current decision's `decisionHash`
   - Otherwise: `DECISION_HASH_MISMATCH` error

### Override Lifecycle

1. **Decision Issued:**
   - Governance engine produces decision
   - May include `requiredOverrides` array

2. **Human Review:**
   - Human views decision in cockpit
   - Reviews governance reasons
   - Determines if override needed

3. **Override Creation:**
   - Human provides: verdictAfter, justification
   - System validates against rules
   - Computes overrideHash
   - Appends to override store

4. **Audit Trail:**
   - Original decision remains unchanged
   - Override record linked via decisionHash
   - Timeline view shows both decision and override

### Store Characteristics

**Append-Only:**
- Overrides are never updated or deleted
- No `updatedAt` or `deleted` fields
- Historical record is immutable

**In-Memory (v1):**
- Overrides stored in memory only
- Lost on server restart
- v2+ will persist to database

**Query Interface:**
- `getOverridesByProposalId(proposalId)`
- Returns all overrides for a proposal (chronological order)

---

## Production Shadow Mode (Phase 10)

### Purpose

Observe production events in SimCity simulation without any side effects.

### Shadow Events

```typescript
ShadowEvent {
  source: 'production'
  timestamp: string               // ISO 8601 from production
  domainEvent: unknown            // production event payload
}
```

### Shadow Pipeline

1. **Collection:**
   - `collectShadowEvents(window)`: retrieves production events for time window
   - Phase 10: stub implementation (returns empty array)
   - Future: hook into production event stream

2. **Transformation:**
   - Production events transformed to SimCity event format
   - Domain-specific mapping (implementation detail)

3. **Simulation:**
   - Events fed into SimCity metrics extractors
   - Dials evaluated against simulated metrics
   - Governance rules applied (hypothetical verdict)

4. **Comparison:**
   - SimCity simulated metrics vs production actual metrics
   - Deltas computed
   - Divergence flags identified

### Shadow Comparison Report

```typescript
ShadowComparisonReport {
  window: string                  // time window specification
  simcityMetrics: Record<string, number>
  prodMetrics: Record<string, number>
  deltas: Array<{
    metric: string
    simcityValue: number
    prodValue: number
    delta: number
  }>
  hypotheticalVerdict: GovernanceVerdict
  divergenceFlags: string[]
  reportHash: string
}
```

### Guarantees

**No Side Effects:**
- Shadow mode never writes to production
- No proposals generated from shadow events
- No overrides applied
- Pure observation and analysis

**Deterministic Reports:**
- Same production events → same report
- reportHash is stable for identical inputs

**Hypothetical Verdict:**
- Computed based on simulated dials
- Indicates what SimCity would decide
- Does not trigger any actions

---

## Hashing and Determinism

### Hash Functions

All hashes use SHA-256 of stable JSON representation.

**Stable JSON:**
- Objects sorted by key
- Arrays sorted (where order doesn't matter)
- Dates serialized to ISO 8601
- Floating point numbers with fixed precision

### Hash Types

**1. inputsHash:**
- Hash of governance evaluation inputs
- Includes: proposal, dials snapshot, replay context
- Excludes: timestamps, run IDs, volatile metadata

**2. decisionHash:**
- Hash of decision content
- Includes: verdict, reasons, required overrides
- Excludes: evaluatedAtTick, inputsHash, decisionHash itself

**3. overrideHash:**
- Hash of override record
- Includes: all fields except overrideHash
- Links override to decision via decisionHash

**4. reportHash:**
- Hash of replay or shadow report
- Includes: all report content except reportHash
- Enables report integrity verification

### Determinism Guarantees

**Event Generation:**
- Same seed + tick + domain + type → same event ID
- Same seed + config → same event sequence

**Metrics Computation:**
- Same events → same metrics (bit-for-bit)
- Extractor functions are pure

**Dial Evaluation:**
- Same metrics + dial definitions → same dial statuses
- Zone classification is deterministic

**Governance Evaluation:**
- Same context → same decision
- Rule application order is fixed
- Verdict escalation is deterministic

**Hashing:**
- Same inputs → same hash
- Hash functions are pure (no randomness)

### Hash Verification

**Decision Integrity:**
- Verify `decisionHash` matches decision content
- Verify `inputsHash` matches evaluation inputs
- Mismatch indicates corruption or tampering

**Override Linking:**
- Verify `override.decisionHash` matches `decision.decisionHash`
- Links override to specific decision instance
- Prevents override application to wrong decision

**Report Integrity:**
- Verify `reportHash` matches report content
- Enables trust in stored replay/shadow reports

---

## Safety Guards

### Runtime Guards

**1. Environment Allowlist:**
- SimCity only allowed in non-production environments
- `DEPLOY_ENV=production` → rejection
- `SIMCITY_ALLOWED_ENVS` must include current environment
- Guarded at API entry points

**2. Running State Check:**
- Many operations require SimCity to be running
- `simCityStatus().running === true`
- Prevents operations on stopped/invalid state

**3. Proposal Validation:**
- Proposals validated before acceptance
- Invalid proposals rejected
- Validation rules: ID uniqueness, required fields, confidence range

**4. Override Validation:**
- All override validation rules enforced (see Phase 9)
- Fail-closed: invalid override → error, no partial state

### CI/CD Guards

**1. Type Safety:**
- Full TypeScript coverage
- Type definitions for all interfaces
- Compile-time guarantees

**2. Determinism Tests:**
- Tests verify same inputs → same outputs
- Hash stability verified
- Event ID determinism verified

**3. Guard Tests:**
- Environment allowlist behavior tested
- Validation rules tested
- Error cases verified

### Operational Guards

**1. In-Memory Only (v1):**
- No persistent storage reduces blast radius
- State lost on restart (by design)
- Prevents long-term state corruption

**2. Read-Only APIs:**
- Most APIs are read-only
- Only override creation is write operation
- Write operations are append-only

**3. Hash Verification:**
- All critical data structures include hashes
- Enables integrity checking
- Prevents silent corruption

---

## API Surface

### Read-Only APIs

**Simulation Status:**
- `GET /api/ops/controlplane/simcity/status`
- Returns: running state, tick, config, metrics

**Proposals:**
- `GET /api/ops/controlplane/simcity/proposals`
- Returns: list of all proposals

**Governance:**
- `GET /api/ops/controlplane/simcity/governance`
- Returns: decisions for all proposals
- Query params: `variantRunId`, `variantId` (for replay context)

- `GET /api/ops/controlplane/simcity/governance/[proposalId]`
- Returns: decision for specific proposal

**Metrics & Dials:**
- `GET /api/ops/controlplane/simcity/dials/snapshot`
- Returns: current metrics and dial statuses

**Replays:**
- `GET /api/ops/controlplane/simcity/replays`
- Returns: list of all replay runs

- `GET /api/ops/controlplane/simcity/replay/[runId]/report`
- Returns: replay diff report

- `GET /api/ops/controlplane/simcity/replay/[runId]/evaluation`
- Returns: replay evaluation results

**Overrides:**
- `GET /api/ops/controlplane/simcity/overrides?proposalId=...`
- Returns: override records (filtered by proposalId if provided)

**Shadow:**
- `GET /api/ops/controlplane/simcity/shadow?window=...`
- Returns: shadow comparison report

### Write APIs

**Override Creation:**
- `POST /api/ops/controlplane/simcity/override`
- Body: `{ proposalId, decisionHash, verdictAfter, justification, actor }`
- Returns: created override record
- Validates all override rules
- Appends to override store (append-only)

**Simulation Control:**
- `POST /api/ops/controlplane/simcity/start`
- `POST /api/ops/controlplane/simcity/stop`
- Control simulation lifecycle (not part of governance pipeline)

### API Guards

All APIs (except public status) are guarded by:
- `ensureSimCityAllowed()`: environment allowlist check
- Returns 403 if not allowed

Write APIs additionally validate:
- Request structure
- Business rules (override validation, etc.)
- State consistency (decisionHash match, etc.)

---

## Invariants

The following invariants are non-negotiable and must hold at all times:

### 1. Determinism Invariant

**Statement:** Given identical inputs (seed, config, tick range), the system produces identical outputs (events, metrics, decisions, hashes).

**Enforcement:**
- Seeded PRNG for all randomness
- Deterministic event ID generation
- Pure functions for metrics extraction
- Stable JSON serialization for hashing
- Fixed rule application order

**Violation Impact:**
- Breaks reproducibility
- Invalidates hash-based verification
- Compromises audit trail

### 2. Fail-Closed Invariant

**Statement:** Any error, uncertainty, or missing data results in the safest possible state (typically BLOCK verdict).

**Enforcement:**
- Missing dials → BLOCK
- Invalid proposals → BLOCK
- Hash mismatch → rejection
- Validation failure → error, no partial state

**Violation Impact:**
- Unsafe operations might proceed
- System integrity compromised

### 3. Append-Only Invariant

**Statement:** Historical records (decisions, overrides, replay reports) are never modified or deleted.

**Enforcement:**
- Override records have no `updatedAt` or `deleted` fields
- Decisions are immutable after creation
- Replay reports stored, not recalculated

**Violation Impact:**
- Audit trail corrupted
- Non-repudiation compromised
- Historical analysis invalidated

### 4. Hash Integrity Invariant

**Statement:** All hashes correctly represent their content, and hash mismatches are detected and rejected.

**Enforcement:**
- Hash computed from stable JSON representation
- Hash verification on critical operations
- Mismatch detection in override validation

**Violation Impact:**
- Data integrity cannot be verified
- Tampering detection fails
- Decision linking breaks

### 5. Advisory Invariant

**Statement:** SimCity v1 never directly modifies production systems or enforces decisions.

**Enforcement:**
- No production write operations
- Decisions are outputs, not commands
- Overrides are records, not executions
- Shadow mode is observation-only

**Violation Impact:**
- System boundary violated
- Safety guarantees invalidated
- Operational risk introduced

### 6. Cockpit Read-Only Invariant

**Statement:** The cockpit UI displays data but does not influence decisions or system behavior.

**Enforcement:**
- No business logic in UI components
- No threshold configuration in UI
- No aggregation beyond API data
- All data fetched server-side

**Violation Impact:**
- Decision integrity compromised
- UI becomes part of decision logic
- Determinism broken

### 7. Override Validation Invariant

**Statement:** All override creation requests are validated against all rules before acceptance.

**Enforcement:**
- Check decision requires override
- Check justification provided
- Check actor role sufficient
- Check decisionHash matches
- All checks must pass

**Violation Impact:**
- Invalid overrides accepted
- Audit trail incomplete
- Security boundaries breached

### 8. Shadow Mode Isolation Invariant

**Statement:** Shadow mode operations have zero side effects on production or live simulation.

**Enforcement:**
- Shadow events never trigger proposals
- Shadow simulation isolated from live state
- No writes from shadow operations
- Hypothetical verdicts never executed

**Violation Impact:**
- Production contamination
- Live simulation interference
- Safety guarantees violated

---

## Known Limitations

The following limitations are accepted in v1 and documented for transparency:

### 1. In-Memory Storage

**Limitation:** All state (events, proposals, decisions, overrides) stored in memory only.

**Impact:**
- State lost on server restart
- No persistence across deployments
- Limited history retention

**Mitigation:**
- Acceptable for v1 as system is advisory
- v2+ will add persistent storage

### 2. No Override Execution

**Limitation:** Overrides are recorded but not automatically executed.

**Impact:**
- Humans must manually apply overrides
- No automated promotion based on override
- Override and execution are separate steps

**Mitigation:**
- By design: advisory system
- Execution is separate system responsibility

### 3. Shadow Mode Stub

**Limitation:** Shadow event collection is stub implementation (returns empty array).

**Impact:**
- Shadow reports have no production data
- Comparison is simulated vs simulated
- Production observation not yet functional

**Mitigation:**
- Infrastructure ready for v2+ integration
- APIs and data structures in place

### 4. Limited Replay History

**Limitation:** Replay store bounded to latest 10 runs.

**Impact:**
- Older replays automatically evicted
- Limited historical analysis capability

**Mitigation:**
- Acceptable for v1
- v2+ will add persistent replay storage

### 5. Single-Tenant Simulation

**Limitation:** One simulation runs at a time per instance.

**Impact:**
- Cannot compare multiple scenarios concurrently
- Sequential replay execution

**Mitigation:**
- Sufficient for v1 use cases
- v2+ may add parallel simulation support

### 6. No Real-Time Production Integration

**Limitation:** No live connection to production event streams.

**Impact:**
- Shadow mode uses stub data
- Cannot observe production in real-time

**Mitigation:**
- By design: observation only
- v2+ may add optional real-time feeds

### 7. Governance Rules Not Configurable

**Limitation:** Governance rules are hardcoded (DEFAULT_GOVERNANCE_RULES).

**Impact:**
- Cannot adjust rules without code changes
- No runtime rule configuration

**Mitigation:**
- Rules are stable and auditable
- v2+ may add rule configuration API

### 8. Dial Thresholds Not Configurable

**Limitation:** Dial thresholds (green/yellow/red) are hardcoded.

**Impact:**
- Cannot adjust thresholds without code changes
- No runtime threshold tuning

**Mitigation:**
- Thresholds are documented and stable
- v2+ may add threshold configuration

---

## Extension Points (v2+)

The following areas are explicitly designed for future extension:

### 1. Persistent Storage

**Current:** In-memory only  
**Extension:** Database persistence for:
- Events (with retention policies)
- Decisions (full history)
- Overrides (append-only table)
- Replay reports (with indexing)

### 2. Production Event Integration

**Current:** Shadow mode stub  
**Extension:** Real production event streams:
- Event collector hooks
- Transformation pipelines
- Real-time shadow updates

### 3. Rule Configuration

**Current:** Hardcoded rules  
**Extension:** Runtime rule configuration:
- Rule definition API
- Rule versioning
- A/B testing of rule sets

### 4. Dial Configuration

**Current:** Hardcoded thresholds  
**Extension:** Runtime threshold management:
- Threshold adjustment API
- Threshold versioning
- Gradual threshold migration

### 5. Override Execution

**Current:** Record only  
**Extension:** Automated override application:
- Override → execution pipeline
- Execution verification
- Rollback capabilities

### 6. Multi-Tenant Simulation

**Current:** Single simulation  
**Extension:** Parallel simulations:
- Scenario branching
- Concurrent replay execution
- Simulation comparison tools

### 7. Advanced Analytics

**Current:** Basic metrics and dials  
**Extension:** Advanced analysis:
- Trend detection
- Anomaly identification
- Predictive metrics

### 8. Integration APIs

**Current:** Internal APIs only  
**Extension:** External integration:
- Webhook notifications
- Decision export formats
- Third-party system integration

---

## Glossary

**Advisory System:** System that provides recommendations but does not enforce them.

**Append-Only:** Data structure where records are only added, never modified or deleted.

**Decision Hash:** Cryptographic hash of decision content (verdict, reasons, overrides).

**Dial:** Threshold configuration for a metric, defining green/yellow/red zones.

**Deterministic:** System behavior where same inputs always produce same outputs.

**Fail-Closed:** Design principle where errors default to safest state (typically BLOCK).

**Governance Engine:** Component that evaluates proposals against rules and dials.

**Inputs Hash:** Cryptographic hash of evaluation inputs (proposal, dials, context).

**Override:** Human decision to change a machine-generated verdict.

**Override Hash:** Cryptographic hash of override record content.

**Proposal:** Candidate action suggested by the system (LLM or rules-based).

**Replay:** Re-simulation of a scenario with different interventions.

**Report Hash:** Cryptographic hash of replay or shadow report content.

**Seed:** Initial value for pseudo-random number generator, ensuring reproducibility.

**Shadow Mode:** Observation of production events in simulation without side effects.

**Tick:** Discrete time unit in simulation progression.

**Verdict:** Governance decision outcome: ALLOW, WARN, or BLOCK.

---

**Document Status:** FROZEN  
**Last Updated:** 2024  
**Version:** 1.0  
**Next Review:** v2.0 Planning

