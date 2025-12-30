# Operational Layers Contract

This document defines the operational layer architecture for Bookiji. These layers form a **contract**, not a roadmap.

## Layer Overview

| Layer | Status | Purpose |
|-------|--------|---------|
| Layer 0 | Active | Execution Safety |
| Layer 1 | Active | Incident Response & Learning |
| Layer 2 | Active | Change Management & Rollbacks |
| Layer 3 | Active | Release Confidence & Proof |
| Layer 4 | Defined (Dormant) | Policy Evolution & Guardrail Improvement |
| Layer 5 | Defined (Dormant) | Strategic Reflection |

---

## Layer 0 — Execution Safety

**Status**: Active

**Purpose**: Hard invariants, guards, kill switches, code-level enforcement.

**Scope**: Runtime safety mechanisms built into the codebase.

**Documentation**: See code-level guards and invariants.

---

## Layer 1 — Incident Response & Learning

**Status**: Active

**Purpose**: When something goes wrong, humans don't freeze, argue, or improvise.

**Scope**:
- Severity model
- Incident Commander model
- Postmortem process
- Incident classification badges (informational only)

**Documentation**:
- `docs/operations/incidents/SEVERITY_MODEL.md`
- `docs/operations/incidents/INCIDENT_COMMANDER.md`
- `docs/operations/incidents/POSTMORTEM_TEMPLATE.md`

**Key Principle**: Informational only. No automation. No decision-making.

---

## Layer 2 — Change Management & Rollbacks

**Status**: Active

**Purpose**: Rapid identification of production-affecting changes and safe rollback procedures.

**Scope**:
- Operations changelog discipline
- Rollback guidance for code, config, database, third-party
- Human judgment only

**Documentation**:
- `docs/operations/CHANGELOG.md`
- `docs/operations/ROLLBACKS.md`

**Key Principle**: Human-triggered only. No automation.

---

## Layer 3 — Release Confidence & Proof

**Status**: Active

**Purpose**: Deterministic proof of correctness before production changes.

**Scope**:
- Proof requirements for releases
- Proof runbook
- Binary pass/fail validation
- Human-run only

**Documentation**:
- `docs/operations/RELEASE_CONFIDENCE.md`
- `docs/operations/PROOF_RUNBOOK.md`

**Key Principle**: Deterministic, repeatable, observable. No interpretation.

---

## Layer 4 — Policy Evolution & Guardrail Improvement

**Status**: **Defined but Dormant**

**Purpose**: Simulation and suggestion for policy and guardrail improvements.

**Scope** (when active):
- Simulation-only analysis
- Suggestion generation
- Policy improvement recommendations
- Guardrail effectiveness analysis

**Current Status**: **NOT IMPLEMENTED**

**Explicit Prohibitions**:
- ❌ NO automation
- ❌ NO enforcement
- ❌ NO background execution
- ❌ NO auto-approval
- ❌ NO automatic policy changes
- ❌ NO automatic guardrail updates

**If Implemented** (future):
- All suggestions must route through Layer 2 (Change Management)
- All changes must pass Layer 3 (Release Confidence)
- All policy changes require human approval
- All guardrail changes require human approval
- No autonomous decision-making

**Why Defined**: Provides vocabulary and prevents premature system growth. Establishes boundaries for future work.

---

## Layer 5 — Strategic Reflection

**Status**: **Defined but Dormant**

**Purpose**: Optional human reflection on system evolution and strategic decisions.

**Scope** (when active):
- Long-term system health assessment
- Strategic decision documentation
- Pattern recognition across incidents
- Organizational learning

**Current Status**: **NOT IMPLEMENTED**

**Explicit Prohibitions**:
- ❌ NO tooling
- ❌ NO cadence (no scheduled reviews)
- ❌ NO enforcement (completely optional)
- ❌ NO ownership implied (no assigned responsibility)
- ❌ NO automation
- ❌ NO required outputs

**If Implemented** (future):
- Completely human-driven
- No scheduled reviews
- No required participation
- No enforcement mechanisms
- No tooling or automation

**Why Defined**: Provides vocabulary for strategic discussions. Prevents confusion about optional vs. required activities.

---

## Why Layers 4 and 5 Are Defined But Not Active

### Purpose of Definition

1. **Vocabulary**: Establishes common language for discussing future capabilities
2. **Boundaries**: Prevents premature system growth and automation creep
3. **Contract**: Sets expectations about what is and is not implemented
4. **Clarity**: Reduces confusion about system capabilities

### What "Dormant" Means

- **No implementation**: No code, no tooling, no automation
- **No activation**: No triggers, no schedules, no background processes
- **No enforcement**: No requirements, no obligations, no ownership
- **Documentation only**: Exists only as a definition in this document

### What "Dormant" Does NOT Mean

- ❌ NOT a roadmap
- ❌ NOT a plan
- ❌ NOT a commitment to implement
- ❌ NOT a placeholder for future work

### Activation Criteria (Hypothetical)

If Layers 4 or 5 were to be activated in the future:

1. **Explicit decision**: Requires formal decision to activate
2. **Layer 2 compliance**: All changes must route through Change Management
3. **Layer 3 compliance**: All changes must pass Release Confidence proof
4. **Human approval**: All outputs require human review and approval
5. **No automation**: No autonomous decision-making or enforcement

**Current state**: No activation planned. No activation criteria defined. Layers remain dormant.

---

## Layer Interaction Rules

### Active Layers (0-3)

- Layer 0 provides execution safety
- Layer 1 provides incident response
- Layer 2 provides change management
- Layer 3 provides release confidence

**Interaction**: Layers 0-3 work together. Each layer builds on previous layers.

### Dormant Layers (4-5)

- Layer 4: If activated, must route through Layers 2 and 3
- Layer 5: If activated, remains completely optional and human-driven

**Interaction**: Dormant layers do not interact with active layers. They exist only as definitions.

---

## Contract Principles

1. **Layers 0-3 are active**: Implemented, documented, in use
2. **Layers 4-5 are dormant**: Defined but not implemented
3. **No automation creep**: Dormant layers cannot be activated without explicit decision
4. **Human control**: All active layers require human judgment and approval
5. **Deterministic**: All active layers produce deterministic, observable results

---

## Maintenance

This contract is maintained as part of operational documentation. Changes to layer definitions require:
- Update to this document
- Update to relevant layer documentation
- No code changes required (documentation-only)

**Last Updated**: 2025-12-27












