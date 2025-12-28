## Executive Dashboard Option A (Sub-Item Granularity)

### Parent vs Sub-Item Authority

- **Parent rows** remain script-owned truths. They are computed, overwritten on every sync, and surface subsystem state for executives.
- **Sub-items** live under parents to provide claims, evidence, and ETC context. They do not override parent truth; they explain *why* the parent is set as it is.
- Manual edits of parent Phase/Risk/Environment are corrected by `pnpm monday:executive`, ensuring deterministic behavior.

> Parent rows assert truth; sub-items justify it; ETC estimates effort; only the repo decides authority.

### Aggregation Rules (future enforcement)

- **Phase**: Blocked > Concept > Rehearsing > Certified > Deprecated.
  - If any sub-item is **Blocked**, parent Phase must be Blocked.
  - Otherwise parent Phase is the lowest (i.e., most conservative) phase among sub-items.
  - When no sub-items exist, default parent Phase to Concept.
- **Risk**: High > Medium > Low.
  - Parent Risk equals the maximum risk level observed in sub-items (High wins over Medium/Low, Medium beats Low).
- **Freshness**:
  - Parent *Last Verified* should mirror the oldest Last Verified timestamp among sub-items so stale evidence bubbles up immediately.

These rules are documented here for future enforcement; the current sync script remains unchanged for parents.

### ETC Semantics

- ETC lives only on sub-items as an informational magnitude (hours/days). It does not influence Phase, Risk, or parent scheduling.
- ETC is optional, may be inaccurate, and should never be summarized or enforced on parent rows yet.
- ETC may inform humans or downstream agents later, but for now it is purely descriptive.

### Manual Sub-Item Guidance (Option A rollout)

1. Use the Monday UI to add sub-items under each parent subsystem.
2. Populate columns: **Claim** (sub-item name), **Phase**, **Risk**, **ETC**, **Evidence**, **Last Verified**.
3. Do not add Environment, Owners, status synonyms, or progress bars to sub-items.
4. Treat sub-items as explanatory context only; let the script retain control over parent columns.

Future automation can read these sub-items to enforce aggregation rules and highlight drift, but no additional code is introduced yet.
