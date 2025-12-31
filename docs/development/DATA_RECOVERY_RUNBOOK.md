# Data Recovery Runbook (Bookiji)

> NEVER TOUCH PROD. Recovery workflows only target a dedicated recovery project and a local or isolated environment. If you are not 100% sure of the target, stop.

This runbook defines the compliant, reproducible process to recover data (DB + storage) into a non-prod recovery environment. It is aligned with existing documentation and forbids secrets or exports in git.

## Table of contents
- Scope
- Do / Don't
- Roles and access
- Artifacts (pre-requisites)
- Manifest naming and ownership
- Operational plan (source of truth)
- Validation requirements
- Rollback
- Acceptance criteria
- References

## Scope
- Applies to recovery into a new Supabase project or equivalent isolated environment.
- Does not authorize production access or production restores.
- Recovery data is separate from deterministic seed data used for dev/QA.

## Do / Don't
Do:
- Use a dedicated recovery project with explicit env guard `RECOVERY_ENV=1`.
- Store exports in encrypted external storage (not in this repo).
- Capture command logs in `./recovery-logs/` with timestamps.
- Verify row counts, FK validity, storage counts, and RLS sanity before any promotion.

Don't:
- Never run recovery scripts against prod or any environment you cannot positively identify.
- Never commit secrets, dumps, or raw exports.
- Never bypass migration history repair after a restore.
- Never skip validations, even if tables are empty.

## Roles and access
Required environment variables (names only, no values committed):
- `RECOVERY_ENV=1` (hard guard, required by scripts)
- `DATABASE_URL_RECOVERY` (target recovery DB)
- `SUPABASE_PROJECT_REF_RECOVERY` (explicit allow/deny target)

Optional recovery-only variables:
- `SUPABASE_URL_RECOVERY`
- `SUPABASE_SECRET_KEY_RECOVERY`
- `SUPABASE_DB_PASSWORD_RECOVERY` (for `supabase` CLI)
- `SUPABASE_ACCESS_TOKEN_RECOVERY` (if required by CLI)
- `STORAGE_ENDPOINT_RECOVERY`
- `STORAGE_BUCKET_RECOVERY`
- `STORAGE_ACCESS_KEY_ID_RECOVERY` / `STORAGE_SECRET_ACCESS_KEY_RECOVERY`
- `STORAGE_PREFIX_RECOVERY`
- `RECOVERY_ALLOWED_PROJECT_REFS` (comma-separated allowlist)
- `RECOVERY_DENY_PROJECT_REFS` (comma-separated denylist)
- `RECOVERY_RUN_ID` (optional stable log run id)

Storage of exports:
- DB dumps and storage exports live in encrypted external storage (not in git).
- For local work, keep artifacts under `./recovery-artifacts/` (git-ignored).
- Only example manifests are committed; real manifests may be stored alongside exports.

Command logs:
- All recovery scripts must write timestamped logs in `./recovery-logs/`.
- Keep logs for audit and reproducibility.

## Artifacts (pre-requisites)
- DB dump (SQL or custom format) from the original source.
- Storage export (bucket objects) from the original source.
- Optional manifests for validation:
  - `manifests/db_counts.json`
  - `manifests/storage_manifest.json`

## Manifest naming and ownership
Expected manifest names:
- `manifests/db_counts.json`
- `manifests/storage_manifest.json`

Commit policy:
- Commit only example manifests (sanitized):
  - `manifests/db_counts.example.json`
  - `manifests/storage_manifest.example.json`
- Never commit real exports, raw manifests, or secrets.

## Operational plan (source of truth)

### Pre-requisites (artefacts)
- Confirm recovery target is a dedicated non-prod project.
- Confirm exports are present in encrypted external storage.
- Prepare `manifests/*.json` if counts and storage inventory are available.
- Ensure `.env.recovery` exists locally (not committed) with the required env vars.
- Set allow/deny lists to prevent accidental prod targeting.

### Import sequence (DB + storage)
1) Restore DB into recovery target.
   - Use `pg_restore` for `.dump/.backup` and `psql` for `.sql`.
   - Use safe flags: `--no-owner --no-privileges` and `--single-transaction` when possible.
   - Optional `DISABLE_TRIGGERS=1` for large restores (documented).
2) Align migration history per `docs/development/MIGRATION_RECOVERY.md`.
   - `supabase migration list --linked --password "$SUPABASE_DB_PASSWORD_RECOVERY"`
   - `supabase migration repair --status applied <versions> --password "$SUPABASE_DB_PASSWORD_RECOVERY" --yes`
3) Import storage objects (dry-run first, then apply).

### Validation (checks)
Required validations (must be run every time):
- DB row counts by table (sorted, public schema).
- FK validity: no invalid foreign keys.
- Minimal functional queries that succeed even with empty tables.
- Storage counts and total size from manifest vs recovered storage.
- RLS sanity check (basic select/insert behavior under expected roles).

If a manifest is provided, compare counts and surface mismatches.

### Rollback
- If validation fails, do not promote.
- Recreate the recovery project and re-run the import sequence.
- Keep logs and manifests from the failed run for audit.

### Tooling/scripts (no secrets)
Expected scripts (created in the next implementation step):
- `scripts/recovery/import_db.sh`
- `scripts/recovery/import_db.ps1`
- `scripts/recovery/verify_db.ts`
- `scripts/recovery/import_storage.sh`
- `scripts/recovery/import_storage.ps1`
- `scripts/recovery/verify_storage.ts`
- `scripts/recovery/report.template.md`
- `scripts/recovery/README.md`
- Example manifests in `manifests/`

All scripts must:
- Refuse to run unless `RECOVERY_ENV=1`.
- Enforce project allow/deny lists.
- Write timestamped logs in `./recovery-logs/`.
- Avoid secrets and avoid storing outputs outside the repo (except logs and manifests).

### Boundary: seed vs recovered data
- Seed data is deterministic and disposable (see `docs/development/DATA_POSTURE.md`).
- Recovered data is authoritative historical data and must not be mixed with seed flows.
- Do not run seed scripts after recovery unless explicitly intended for QA only.

### Minimal workflow
Bash (Linux/macOS):
- `export RECOVERY_ENV=1`
- `cp .env.recovery.example .env.recovery` and fill values locally
- `./scripts/recovery/import_db.sh /path/to/db.dump`
- `./scripts/recovery/import_storage.sh --path /path/to/storage-export --dry-run`
- `./scripts/recovery/import_storage.sh --path /path/to/storage-export --apply`
- `pnpm recovery:verify`

PowerShell (Windows):
- `$env:RECOVERY_ENV="1"`
- `Copy-Item .env.recovery.example .env.recovery` and fill values locally
- `./scripts/recovery/import_db.ps1 -DumpPath C:\path\to\db.dump`
- `./scripts/recovery/import_storage.ps1 -Path C:\path\to\storage-export -DryRun`
- `./scripts/recovery/import_storage.ps1 -Path C:\path\to\storage-export -Apply`
- `pnpm recovery:verify`

### Compliance attention points
- Zero secrets in repo (including `.env.recovery`).
- Exports remain encrypted and external.
- Recovery must not break `pnpm contract` and other required tests.
- All steps must be reproducible on Windows and macOS/Linux.

## Validation requirements
Minimum checks to pass before any promotion:
- Row counts collected and reviewed (manifest comparison if available).
- No invalid FKs.
- Storage counts and total size match manifest (or are explained).
- RLS sanity checks pass.

## Acceptance criteria
- Scripts contain no secrets or embedded credentials.
- `.env.recovery` is listed in `.gitignore`.
- Workflow runs on Windows (PowerShell) and macOS/Linux (bash).
- Required validations are executed (row counts, FK, storage counts, RLS sanity).

## References
- `docs/development/DATA_POSTURE.md`
- `docs/development/MIGRATION_RECOVERY.md`
- `docs/development/CONTRACT_TESTS.md`
