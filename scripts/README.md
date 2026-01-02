Scripts directory

Available helpers:

- `create-worktree.sh` / `create-worktree.ps1` — create a git worktree and branch for a feature.
- `create-supabase-migration.sh` — wrapper to run `supabase migration new <name>`.

Usage (bash):

```
./scripts/create-worktree.sh feature/my-task
./scripts/create-supabase-migration.sh calendar_sync_foundations
```

Usage (PowerShell):

```
.\scripts\create-worktree.ps1 feature/my-task
```

Notes:
- Scripts are minimal convenience wrappers. They do not change CI or run migrations automatically.
- Follow `docs/CONCURRENT_WORKFLOWS.md` for process and migration ownership rules.

