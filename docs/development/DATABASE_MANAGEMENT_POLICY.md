# Database Management Policy (Supabase) — Bookiji

This repo follows a **CLI-only, migration-first** database process. The goal is to keep schema changes deterministic, reviewable, reproducible, and consistent across environments.

## Non‑Negotiables

- **No manual SQL in Supabase dashboard** for schema changes.
  - **Schema changes MUST be done via migrations** committed to `supabase/migrations/`.
  - The dashboard SQL editor is allowed only for **read-only investigation** (SELECTs) and **platform-guided backup restore** operations.
- **Never create migration files manually.**
  - Always create migrations using: `supabase migration new <name>`.
- **Never run “ad-hoc” SQL against production/staging** (including `psql` changes) except when restoring a Supabase-provided backup to a new project during an incident.
- **Always apply migrations via CLI**:
  - Local: `supabase db reset` (for full reset) or `supabase db push`
  - Remote: `supabase db push`
- **No secrets in repo**:
  - `env.template` must contain **placeholders only**.

## Required Workflow (Schema Change)

### 1) Create a migration (CLI only)

```bash
supabase migration new add_provider_blocking
```

This generates a timestamped file under `supabase/migrations/`.

### 2) Edit the generated SQL file

- Use **idempotent** patterns where possible:
  - `CREATE TABLE IF NOT EXISTS ...`
  - `CREATE INDEX IF NOT EXISTS ...`
  - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`
- Avoid destructive changes unless explicitly planned (drop/rename) and documented in the PR.

### 3) Apply locally

```bash
supabase start
supabase db reset
```

### 4) Apply remotely (staging/prod)

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

### 5) Verify

- `supabase migration list --remote`
- App-level smoke tests
- CI should pass

## Naming Rules

- Migration filenames must be:
  - **Timestamped**: `YYYYMMDDHHMMSS_name.sql`
  - Legacy exceptions allowed only for the existing `0001_*.sql`, `0002_*.sql`
- Anything under `supabase/migrations/_hold/` is **NOT** the source of truth for production and should be treated as **local-only emergency reset artifacts**.

## Drift / Integrity

- Drift checks exist (`scripts/check-drift.ts`) and should stay green.
- Any time drift is detected:
  - Stop and fix by creating the missing migration and pushing via CLI.
  - Do not patch production via dashboard SQL.

## Enforcement

This repo enforces the policy via:

- **Pre-commit**: `pnpm db:policy:check`
- **CI**: `node scripts/check-db-policy.mjs`

If these checks fail, the change must be corrected before merging.

## Incident Recovery (Paused Project / Backup Restore)

If Supabase forces a “restore backup to a new project” flow:

1. Create a new project.
2. Restore Supabase’s backup file to the new project.
3. Re-link the repo to the new project.
4. Re-apply migrations via CLI (to ensure schema is consistent with repo).
5. Rotate keys; update env vars.

This is the only supported exception to the “no ad-hoc SQL” rule.















