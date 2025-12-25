# SimCity Architecture Refactor Plan

## Architecture Acknowledgment

**Target Architecture:** Four-layer separation with hard boundaries

1. **Execution Kernel** - Primitive operations only, no LLM, no scenario knowledge
2. **Capability Registry** - Declarative descriptions of WHAT can be tested
3. **Plan Runner** - Executes structured PLAN objects using kernel calls
4. **Planner Interface** - LLM-ready interface (stubbed for now)

**Critical Rule:** Execution Kernel must NOT know about "double booking", "reschedule", LLMs, or natural language.

---

## 1. Execution Kernel Primitives (Extracted from SC-1/SC-4)

### Identified Primitives

From analysis of existing SC-1 and SC-4 code, the kernel must expose:

```typescript
// Kernel API (TypeScript definition for clarity, implementation in JS)
interface ExecutionKernel {
  // Fixture Management
  createFixture(type: 'vendor' | 'customer' | 'slot' | 'service' | 'booking', spec: FixtureSpec): Promise<FixtureId>
  
  // Request Execution (fire-and-forget, at-least-once delivery)
  sendRequest(intentId: string, endpoint: string, payload: Record<string, unknown>): Promise<void>
  
  // Process Simulation
  restartProcess(delayMs?: number): Promise<void>
  
  // State Querying
  queryState(query: StateQuery): Promise<StateSnapshot>
  
  // Invariant Assertion
  assertInvariant(invariantId: string, state: StateSnapshot, expected: InvariantExpectation): AssertionResult
  
  // Forensic Snapshot
  snapshotState(state: StateSnapshot, metadata: SnapshotMetadata): ForensicSnapshot
}
```

### Primitive Details

**createFixture:**
- Creates test data (vendor, customer, slot, service, booking)
- Returns fixture ID for reference
- Idempotent (can be called multiple times safely)

**sendRequest:**
- Fire-and-forget HTTP/RPC calls
- Uses intent_id for idempotency tracking
- No response waiting, no ordering assumptions
- Supports both REST API and Supabase RPC endpoints

**restartProcess:**
- Simulates process crash/restart
- Optional delay parameter
- Clears in-memory state (if any)

**queryState:**
- Queries database directly (ground truth)
- Returns structured state snapshot
- No business logic interpretation

**assertInvariant:**
- Pure function: state + expectation → pass/fail
- No side effects
- Returns structured result with failure details

**snapshotState:**
- Captures complete state for forensic analysis
- Includes metadata (step, action, timestamp)
- Used for failure reporting

---

## 2. Proposed Folder Structure

```
chaos/
├── kernel/                          # Layer 1: Execution Kernel
│   ├── index.mjs                    # Kernel API implementation
│   ├── primitives/
│   │   ├── fixtures.mjs            # createFixture implementation
│   │   ├── requests.mjs             # sendRequest implementation
│   │   ├── process.mjs              # restartProcess implementation
│   │   ├── queries.mjs              # queryState implementation
│   │   ├── assertions.mjs           # assertInvariant implementation
│   │   └── snapshots.mjs            # snapshotState implementation
│   └── types.mjs                    # Type definitions (JSDoc)
│
├── capabilities/                    # Layer 2: Capability Registry
│   ├── registry.mjs                 # Capability registry loader
│   ├── double_booking_attack.json   # SC-1 capability declaration
│   ├── reschedule_atomicity.json   # SC-4 capability declaration
│   └── README.md                    # Capability format documentation
│
├── runner/                          # Layer 3: Plan Runner
│   ├── index.mjs                    # Plan execution engine
│   ├── chaos.mjs                    # Chaos action application (retry, restart, reorder)
│   ├── assertions.mjs               # Assertion runner (calls kernel.assertInvariant)
│   └── types.mjs                    # PLAN object type definitions
│
├── planner/                           # Layer 4: Planner Interface
│   ├── interface.mjs                # getPlan() function signature
│   ├── stub.mjs                     # Stub implementation (hardcoded plans for now)
│   └── types.mjs                    # Natural language intent types
│
└── scenarios/                       # DEPRECATED (kept for reference, not executed)
    ├── double_booking_attack/      # Original SC-1 (preserved)
    ├── reschedule_atomicity/        # Original SC-4 (preserved)
    └── README.md                     # Migration notes
```

---

## 3. Interface Definitions

### Execution Kernel Interface

```javascript
// chaos/kernel/index.mjs
export class ExecutionKernel {
  constructor(config) {
    this.supabaseUrl = config.supabaseUrl
    this.supabaseHeaders = config.supabaseHeaders
    this.targetUrl = config.targetUrl
    this.rng = config.rng // Seeded PRNG
  }

  async createFixture(type, spec) {
    // Delegates to primitives/fixtures.mjs
    // Returns: { id: string, type: string, data: object }
  }

  async sendRequest(intentId, endpoint, payload) {
    // Delegates to primitives/requests.mjs
    // Fire-and-forget, no return value
  }

  async restartProcess(delayMs) {
    // Delegates to primitives/process.mjs
    // Returns: void
  }

  async queryState(query) {
    // Delegates to primitives/queries.mjs
    // Returns: StateSnapshot
  }

  assertInvariant(invariantId, state, expectation) {
    // Delegates to primitives/assertions.mjs
    // Returns: { pass: boolean, message?: string }
  }

  snapshotState(state, metadata) {
    // Delegates to primitives/snapshots.mjs
    // Returns: ForensicSnapshot
  }
}
```

### Capability Registry Format

```json
// chaos/capabilities/double_booking_attack.json
{
  "id": "double_booking_attack",
  "name": "Double-Booking Attack",
  "description": "Proves slot exclusivity under concurrent demand",
  "requiredPrimitives": [
    "createFixture",
    "sendRequest",
    "queryState",
    "assertInvariant",
    "restartProcess"
  ],
  "supportedInvariants": [
    "cardinality",
    "slot_coherence",
    "booking_coherence",
    "idempotency"
  ],
  "allowedChaosActions": [
    "send_request",
    "retry_request",
    "restart_process",
    "no_op"
  ],
  "fixtureSpecs": {
    "vendor": { "type": "vendor", "required": true },
    "customer1": { "type": "customer", "required": true },
    "customer2": { "type": "customer", "required": true },
    "slot": { "type": "slot", "required": true, "state": "free" },
    "service": { "type": "service", "required": true }
  },
  "intentSpecs": {
    "intentA": {
      "endpoint": "/rpc/claim_slot_and_create_booking",
      "payloadTemplate": {
        "p_slot_id": "{{slot.id}}",
        "p_booking_id": "{{intentA.booking_id}}",
        "p_customer_id": "{{customer1.id}}",
        "p_provider_id": "{{vendor.id}}",
        "p_service_id": "{{service.id}}",
        "p_total_amount": 10.00
      }
    },
    "intentB": {
      "endpoint": "/rpc/claim_slot_and_create_booking",
      "payloadTemplate": {
        "p_slot_id": "{{slot.id}}",
        "p_booking_id": "{{intentB.booking_id}}",
        "p_customer_id": "{{customer2.id}}",
        "p_provider_id": "{{vendor.id}}",
        "p_service_id": "{{service.id}}",
        "p_total_amount": 10.00
      }
    }
  },
  "invariantSpecs": {
    "cardinality": {
      "query": {
        "type": "bookings",
        "filters": { "slot_id": "{{slot.id}}", "status": "!cancelled" }
      },
      "expectation": { "count": { "max": 1 } }
    },
    "slot_coherence": {
      "query": {
        "type": "slot",
        "id": "{{slot.id}}"
      },
      "expectation": {
        "if": { "bookings.count": 1 },
        "then": { "is_available": false }
      }
    }
  }
}
```

### PLAN Object Structure

```typescript
// chaos/runner/types.mjs (JSDoc)
/**
 * @typedef {Object} Plan
 * @property {string} capabilityId - Which capability to test
 * @property {Object} fixtures - Fixture creation plan
 * @property {Object[]} intents - Intent definitions
 * @property {Object} chaos - Chaos configuration (retry rate, restart rate, etc.)
 * @property {Object[]} invariants - Invariants to check
 * @property {number} iterations - Number of chaos loop iterations
 * @property {string} seed - Deterministic seed
 */

/**
 * @typedef {Object} PlanStep
 * @property {number} step - Step number
 * @property {string} action - Action type (send_request, retry_request, restart_process, no_op)
 * @property {string} intentId - Which intent to use (if applicable)
 * @property {number} delayMs - Delay after action (if applicable)
 */
```

### Planner Interface

```javascript
// chaos/planner/interface.mjs
/**
 * @param {string} naturalLanguageIntent - User's natural language request
 * @param {Object} context - Current system context (optional)
 * @returns {Promise<Plan>} Structured plan object
 */
export async function getPlan(naturalLanguageIntent, context = {}) {
  // For now: stub implementation
  // Later: LLM will implement this
  throw new Error('Planner not implemented yet - use stub planner')
}
```

---

## 4. How Existing Code is Repurposed

### SC-1 Code Repurposing

**Current SC-1 structure:**
- Lines 140-292: Fixture creation → **Extract to `kernel/primitives/fixtures.mjs`**
- Lines 294-327: Intent definition → **Convert to `capabilities/double_booking_attack.json`**
- Lines 329-410: Chaos loop → **Extract to `runner/chaos.mjs`**
- Lines 420-460: State querying → **Extract to `kernel/primitives/queries.mjs`**
- Lines 467-540: Assertions → **Extract to `kernel/primitives/assertions.mjs`**
- Lines 542-580: Idempotency check → **Extract to `runner/assertions.mjs`**
- Lines 582-620: Terminal state check → **Extract to `runner/assertions.mjs`**
- Lines 622-640: Forensic snapshot → **Extract to `kernel/primitives/snapshots.mjs`**

**Repurposing strategy:**
1. **Extract shared utilities** (stableUuid, fetchJson, etc.) → `kernel/utils.mjs`
2. **Extract fixture creation logic** → `kernel/primitives/fixtures.mjs` (generic, not SC-1-specific)
3. **Extract query logic** → `kernel/primitives/queries.mjs` (generic query builder)
4. **Extract assertion logic** → `kernel/primitives/assertions.mjs` (pure functions)
5. **Convert intent definitions** → JSON capability files
6. **Extract chaos loop** → `runner/index.mjs` (generic plan executor)
7. **Preserve original files** in `chaos/scenarios/` for reference

### SC-4 Code Repurposing

**Same strategy as SC-1:**
- Fixture creation → `kernel/primitives/fixtures.mjs` (reused)
- Intent definition → `capabilities/reschedule_atomicity.json`
- Chaos loop → `runner/index.mjs` (reused)
- Assertions → `kernel/primitives/assertions.mjs` (reused, different invariants)

**Key insight:** SC-1 and SC-4 share 80% of their code structure. The refactor extracts the common parts into the kernel and runner, leaving only capability-specific metadata in JSON files.

---

## 5. Implementation Order

### Phase 1: Extract Kernel Primitives
1. Create `chaos/kernel/` directory structure
2. Extract `createFixture` from SC-1/SC-4 → `kernel/primitives/fixtures.mjs`
3. Extract `sendRequest` from SC-1/SC-4 → `kernel/primitives/requests.mjs`
4. Extract `queryState` from SC-1/SC-4 → `kernel/primitives/queries.mjs`
5. Extract `assertInvariant` from SC-1/SC-4 → `kernel/primitives/assertions.mjs`
6. Extract `snapshotState` from SC-1/SC-4 → `kernel/primitives/snapshots.mjs`
7. Extract `restartProcess` from SC-1/SC-4 → `kernel/primitives/process.mjs`
8. Create `kernel/index.mjs` that exposes unified API
9. **Test:** Kernel can be imported and used independently

### Phase 2: Create Capability Registry
1. Create `chaos/capabilities/` directory
2. Convert SC-1 intent/assertion logic → `capabilities/double_booking_attack.json`
3. Convert SC-4 intent/assertion logic → `capabilities/reschedule_atomicity.json`
4. Create `capabilities/registry.mjs` to load and validate capabilities
5. **Test:** Registry can load capabilities and validate structure

### Phase 3: Implement Plan Runner
1. Create `chaos/runner/` directory
2. Extract chaos loop logic from SC-1/SC-4 → `runner/index.mjs`
3. Extract chaos action application → `runner/chaos.mjs`
4. Extract assertion running → `runner/assertions.mjs`
5. **Test:** Runner can execute a hardcoded PLAN using kernel

### Phase 4: Create Planner Interface (Stub)
1. Create `chaos/planner/` directory
2. Define `getPlan()` interface → `planner/interface.mjs`
3. Create stub implementation → `planner/stub.mjs` (hardcoded plans for SC-1/SC-4)
4. **Test:** Stub planner can generate valid PLAN objects

### Phase 5: Integration Test
1. Create integration test that:
   - Calls stub planner to get PLAN
   - Passes PLAN to runner
   - Runner uses kernel to execute
   - Verifies same behavior as original SC-1/SC-4
2. **Success criteria:** Integration test produces identical results to original scenarios

---

## 6. Boundary Enforcement

### Kernel Must NOT Know:
- ❌ What "double booking" means
- ❌ What "reschedule" means
- ❌ What an LLM is
- ❌ What natural language is
- ❌ What a "capability" is
- ❌ What a "plan" is

**Enforcement:** Kernel only accepts primitive operations with structured parameters. No business logic interpretation.

### Planner Must NOT:
- ❌ Execute code
- ❌ Query the database
- ❌ Write test files
- ❌ Suggest fixes
- ❌ Know about kernel implementation details

**Enforcement:** Planner only outputs PLAN objects. No execution logic.

### Runner Must NOT:
- ❌ Know about natural language
- ❌ Know about LLMs
- ❌ Interpret business logic
- ❌ Create fixtures directly (must use kernel)

**Enforcement:** Runner only translates PLAN → kernel calls. No scenario-specific logic.

---

## 7. Migration Path

1. **Preserve existing scenarios** in `chaos/scenarios/` (mark as deprecated)
2. **Extract kernel** from existing code (no behavior change)
3. **Create capability registry** from existing scenario metadata
4. **Implement runner** using extracted chaos loop logic
5. **Create stub planner** that generates plans equivalent to SC-1/SC-4
6. **Verify equivalence** - new architecture produces same results
7. **Remove deprecated scenarios** (after verification)

---

## 8. Success Criteria

✅ Kernel can be used independently (no scenario knowledge)  
✅ Capabilities are declarative (JSON, no executable code)  
✅ Runner executes any valid PLAN (not hardcoded to SC-1/SC-4)  
✅ Planner interface is LLM-ready (stub works, LLM can be swapped in)  
✅ Original SC-1/SC-4 behavior preserved (same test results)  
✅ No new test files created (architecture refactor only)  

---

## Next Steps

1. Review and approve this plan
2. Begin Phase 1: Extract Kernel Primitives
3. Iterate through phases sequentially
4. Verify at each phase that boundaries are maintained

