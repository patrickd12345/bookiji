# Data posture (Bookiji)

## Current stance (this repo / Bookiji-Restored)

**Schema is the source of truth; data is disposable for development.**

The restored Supabase project (`uradoazoyhhozbemrccj`) currently has:
- ✅ schema complete
- ❌ **no historical app data** (core tables like `profiles/services/bookings` are empty)

Until we obtain an authoritative production export, we treat the environment as **schema-only + deterministic seed**.

## Dev / QA: deterministic seed (recommended)

Seed a coherent set of vendors, users, services and locations for local dev + QA:

```bash
pnpm seed:pilot
```

Notes:
- Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
- Script is designed to be **safe to re-run** (idempotent behavior).

## If production data recovery becomes mandatory

To recover real historical data, we need **exports from the original Supabase project**:
- **Database export that includes data** (not just schema)
- **Storage export** (bucket objects)

Recovery should follow a runbook:
1) Create a new Supabase project
2) Restore DB export to the new project
3) Run `supabase migration list` + `supabase migration repair` to align history
4) Validate:
   - row counts for core tables are non-zero
   - key constraints exist and inserts/selects work for core flows

This repo intentionally does **not** store exports or secrets.


