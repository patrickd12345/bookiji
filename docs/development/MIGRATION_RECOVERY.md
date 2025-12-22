# Migration coherence / recovery (Supabase)

This repo uses **Supabase CLI migrations** as the *only* supported way to manage schema changes.

## Problem this document addresses

Sometimes the **remote schema exists**, but the **remote migration history** (`supabase_migrations.schema_migrations`) does not match the local `supabase/migrations/` files (e.g. schema was applied during a restore or emergency work).

If left unresolved:
- `supabase db push` can fail or attempt to re-apply migrations that are already present.
- Future schema work becomes drift-prone and unsafe.

## Current project (Bookiji-Restored) normalization

For the restored project (`uradoazoyhhozbemrccj`), the remote schema was already complete, but remote migration history was missing several versions.

We normalized history using the official CLI approach:

- `supabase migration list --linked --password ...`
- `supabase migration repair --status applied <versions...> --password ...`
- Verified with `supabase db push --password ...` → **Remote database is up to date**

## Standard recovery procedure (use this going forward)

1) **Inspect local migrations**
- Check what exists under `supabase/migrations/`
- `_hold/` is **not** part of the production chain.

2) **Inspect remote migration history**

```bash
supabase migration list --linked --password "$SUPABASE_DB_PASSWORD"
```

3) **Classify mismatch**
- **Local has migrations that remote is missing** (common after restores).
- **Remote has migrations that local is missing** (rare; indicates missing files or manual edits).
- **Different ordering / timestamps** (danger; usually means migrations were created outside CLI conventions).

4) **Fix using the smallest safe strategy**
- If schema is already present and should not be re-applied:

```bash
supabase migration repair --status applied <version...> --password "$SUPABASE_DB_PASSWORD" --yes
```

5) **Verify**

```bash
supabase db push --password "$SUPABASE_DB_PASSWORD" --yes
```

Expected output: **Remote database is up to date.**

## Notes
- This process does **not** change schema; it makes the migration history reflect reality.
- Never “fix” this by running dashboard SQL or manually editing migration history tables.










