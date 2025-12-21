# Recovery Toolkit (minimal)

This folder contains the minimal, safe-by-default recovery toolkit.

## Guardrails
- Scripts require `RECOVERY_ENV=1`.
- `SUPABASE_PROJECT_REF_RECOVERY` must be set.
- Optional allow/deny lists:
  - `RECOVERY_ALLOWED_PROJECT_REFS=ref1,ref2`
  - `RECOVERY_DENY_PROJECT_REFS=prod,production`
- Logs are always written to `./recovery-logs/<run_id>/`.

## Setup
1) Copy `.env.recovery.example` to `.env.recovery` and fill values locally.
2) Keep exports outside git (recommended: `./recovery-artifacts/`).

## DB import
Bash:
```bash
export RECOVERY_ENV=1
./scripts/recovery/import_db.sh /path/to/dump.dump
```

PowerShell:
```powershell
$env:RECOVERY_ENV="1"
./scripts/recovery/import_db.ps1 -DumpPath C:\path\to\dump.dump
```

Optional:
- `DISABLE_TRIGGERS=1` for `pg_restore` on large dumps.

## Storage import
Bash:
```bash
export RECOVERY_ENV=1
./scripts/recovery/import_storage.sh --path /path/to/export --dry-run
./scripts/recovery/import_storage.sh --path /path/to/export --apply
```

PowerShell:
```powershell
$env:RECOVERY_ENV="1"
./scripts/recovery/import_storage.ps1 -Path C:\path\to\export -DryRun
./scripts/recovery/import_storage.ps1 -Path C:\path\to\export -Apply
```

Requires `supabase` CLI with `storage cp` support.

## Verify
```bash
pnpm recovery:verify
```

Or individually:
```bash
pnpm recovery:verify:db -- --manifest manifests/db_counts.json
pnpm recovery:verify:storage -- --manifest manifests/storage_manifest.json --actual /path/to/export
```

## Reports
Use `report.template.md` to capture results and attach log paths.
