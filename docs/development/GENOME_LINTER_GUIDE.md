# Genome Linter Guide

How to run, read, and extend the Bookiji Genome linter.

## Running the linter
- Validate and enforce exit codes: `pnpm genome:validate`
- Explanation-only mode (prints policy and breakdown): `pnpm genome:explain`
- Optional flags: `--quiet` to hide per-domain findings, `--repo-root <path>` to point at another checkout
- The linter is **read-only**: it only scans the repo and never mutates files or directories.

## Errors vs. warnings (with examples)
- Errors = required structure violations. Example: missing `ops-state/logs.json`, or `apps/opsai-control-plane/package.json` absent. These fail `genome:validate` and CI.
- Warnings = optional or incomplete items. Example: missing chaos drill markdown under `ops/drills`, or optional telemetry folder empty. Warnings print, but CI still passes.
- Missing directories or unreadable files are reported as findings, not crashes. Fix permissions/paths and rerun.

## Example `--explain` output
```text
> pnpm genome:explain
==== Genome Linter Explanation ====
Bookiji OS 11.0 Genome
- Domains: core, events, temporal, opsai, simcity, helpCenter, notifications, trustSafety, businessIntelligence, governance, evolution
- Errors block CI; warnings are advisory.

[notifications]
  Checks: channels (push,email), requiredFiles
  Rules:
    - folder must exist: src/lib/notifications
    - required file: src/lib/notifications/pushNotifications.ts

[core]
  Modules: control-plane, opsai-sdk, opsai-helpdesk, opsai-l7, opsai-voice
  Runtime profiles: supabase-edge (supabase/config.toml), ops-ledger (ops-state/logs.json)
```

## Example failing CI output
```text
> pnpm genome:validate
==== Genome Lint Summary ====
Errors: 2
Warnings: 1

Errors:
- [notifications] Missing required file: src/lib/notifications/pushNotifications.ts
- [core] Required module "opsai-l7" missing package.json at packages/opsai-l7/package.json

Warnings:
- [simcity] Optional cockpit routes missing (still runs headless)

CI status: FAILED (errors present)
```

## Updating the Genome spec
- Propose edits in `genome/master-genome.yaml` (e.g., add domains, adjust `requiredFiles`, tweak runtime profiles).
- Keep optional assets grouped under non-required collections so they emit warnings, not errors.
- Include a short rationale in the PR for new/changed entries (what validator should enforce and why).
- Validate locally with `pnpm genome:explain` (sanity) then `pnpm genome:validate` (enforcement) before requesting review.
