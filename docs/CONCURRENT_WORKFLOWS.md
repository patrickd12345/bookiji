# Concurrent workflows: worktrees + migration rules

This document describes a lightweight, safe workflow for parallel development using Git worktrees and conventions to avoid migration and deployment conflicts.

## Goals
- Allow multiple engineers/agents to work in parallel using git worktrees.
- Prevent conflicting Supabase migrations and DB pushes.
- Provide small helper scripts to create worktrees and create Supabase migrations via the CLI.

## Recommended workflow (summary)
1. Create a feature branch and worktree for each concurrent task:
   - Shell: `./scripts/create-worktree.sh feature/your-name-short-description`
   - PowerShell: `.\scripts\create-worktree.ps1 feature/your-name-short-description`
2. Build and test locally inside the worktree.
3. If a change requires a DB migration:
   - Create the migration using the Supabase CLI from within that worktree: `./scripts/create-supabase-migration.sh calendar_sync_foundations`
   - Keep the migration file small and focused.
   - Do NOT apply migrations directly to production from a dev machine. Apply in CI or from an authorized workstation.
4. Push branch and open a PR. Mark PR title with `[migration]` if it includes a migration.
5. The team lead / release manager applies migrations serially (see CI enforcement section).

## Migration ownership & CI
- Enforce one migration-apply per deploy: migrations must be applied in a controlled step (CI or release operator).
- CI should run `supabase migration list` and fail if multiple pending migrations conflict or if timestamp ordering is wrong.
- Prefer a migration queue: merge PRs but gate DB apply to a single pipeline step run by release operator.

## Tips and pitfalls
- Keep migrations small and backwards-compatible where possible.
- Rebase regularly to avoid long-lived diverging branches.
- Use feature flags for schema-gated changes that require deploy coordination.

## Scripts
- `scripts/create-worktree.*` — helpers to create a properly named worktree and branch.
- `scripts/create-supabase-migration.*` — wrapper around `supabase migration new`.

If you want, I can add CI job templates that enforce the migration queue and run the Supabase CLI checks.

