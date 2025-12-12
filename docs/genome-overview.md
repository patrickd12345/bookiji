# Genome Overview

The Genome describes the operational contract for Bookiji OS 11.0. It is declared in `genome/master-genome.yaml` as a **read-only reference** and should not be imported by runtime application code. The Genome anchors how core modules, events, observability, and governance artifacts are expected to live inside the repository.

## Where it lives
- **Spec file**: `genome/master-genome.yaml` (Section A blueprint)
- **Linter rules**: `genome/linter-rules.md`
- **CLI entrypoint**: `pnpm genome:validate`

## What the linter enforces
- Presence of required modules and configs (core runtime, OpsAI services, Supabase edges).
- Event contracts, audit feeds, and temporal ledgers defined in the spec.
- Deterministic checks for simulations, traffic profiles, notification channels, and help-center content.
- Governance, evolution, and trust & safety documents to keep operational guardrails auditable.

## How results surface
- Running `pnpm genome:validate` prints findings grouped by domain.
- Errors produce a non-zero exit code and will fail CI; warnings are informational.
- CI workflow `.github/workflows/genome-check.yml` runs the linter on PRs and pushes to main branches.
