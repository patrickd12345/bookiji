# Genome Linter Rules (Bookiji OS 11.0)

This document describes how the Genome linter interprets the master specification at `genome/master-genome.yaml`. The YAML acts as a **read-only reference**; application runtime code must not import it. The linter reads the spec, inspects the repository, and reports violations grouped by validation category.

## Validation semantics
- **Errors**: hard failures that will fail CI and set a non-zero exit code.
- **Warnings**: advisory findings; they print to the console but do not change the exit code.
- **Filesystem checks**: unless otherwise noted, folder and file checks use relative paths from the repository root.
- **Shape validation**: the loader ensures required keys exist and that lists are non-empty when mandated by the spec.

## Categories

### Core
- Expected data: `domains.core.modules` with `id`, `name`, `path`, and optional `requiredFiles`; `runtimeProfiles` with `config` files.
- Linter behavior: verifies each module path exists and any listed files are present; missing paths/files are errors. Runtime profile configs must exist; missing configs are errors.

### Events
- Expected data: `domains.events.contracts` containing contract files and required sections; `catalog.folder` describing the event drill library; optional `telemetry.auditFeeds` arrays.
- Linter behavior: ensures contract files exist (errors if not). If contracts declare `requiredSections`, the file must contain those section names (case sensitive substring match); missing sections are errors. Catalog folders must exist and contain at least one file with a listed extension; missing folder is an error, empty folders trigger warnings. Telemetry audit feeds list files that must exist; missing feeds are errors.

### Temporal
- Expected data: `domains.temporal.audit.ledgers` with log file references, and `domains.temporal.timelines` with `requiredFiles` arrays.
- Linter behavior: log/ledger files must exist (errors). Timeline required files must exist; missing files are errors. The linter also parses JSON-ledger files (when they exist) to ensure they contain an array or object—unparseable JSON becomes an error.

### OpsAI
- Expected data: `domains.opsai.services` listing service folders; `diagnostics.smokeTests` listing script paths.
- Linter behavior: service folders must exist (errors). Smoke test scripts must exist; missing scripts are warnings because they may be intentionally offline.

### SimCity
- Expected data: `domains.simcity.files` and optional `cockpitRoutes` entries pointing at the SimCity daemon and cockpit routes.
- Linter behavior: scenario folder and chaos profile must exist (errors). Traffic sample and load pattern folders must exist; missing directories are warnings so teams can backfill gradually.

### Help Center
- Expected data: `domains.helpCenter.knowledgeBase` with `root` and `requiredFiles`; `userGuides.folder`.
- Linter behavior: knowledge base root must exist (errors) and list its required files (errors if missing). User guide folder absence triggers a warning to encourage docs coverage without blocking CI.

### Notifications
- Expected data: `domains.notifications.channels` each with a `folder`, plus top-level `requiredFiles` for channel primitives.
- Linter behavior: channel folders must exist (errors). Required files must exist (errors). The linter will also warn if a channel folder is empty.

### Trust & Safety
- Expected data: `domains.trustSafety.ledgers` file list and a `drills.folder`.
- Linter behavior: ledger files must exist (errors). Drill folder must exist and contain at least one entry (warning if empty).

### Business Intelligence
- Expected data: `domains.businessIntelligence.telemetry.funnels` directories and `qualityGates` directories/files.
- Linter behavior: funnel directories must exist (errors). Quality gate paths must exist (warnings if missing to allow optional adoption).

### Governance
- Expected data: `domains.governance.policies` files and `approvals.changeControl` file.
- Linter behavior: all listed files must exist (errors). The approval file must be present (error) and non-empty (warning if empty file).

### Evolution
- Expected data: `domains.evolution.flags` files and a `roadmap.file`.
- Linter behavior: flags and roadmap files must exist (errors). The roadmap file must have content (warning if empty) to discourage placeholder stubs.
