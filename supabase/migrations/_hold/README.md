# `_hold/` migrations (NOT for production)

This folder contains **hold / emergency / scratch** SQL used for:

- Local resets
- One-off schema consolidation work
- Forensics or recovery experiments

## Policy

- **Do not** rely on files in this folder for staging/production.
- **Do not** include `_hold` files in normal `supabase db push` workflows.
- The **only** source of truth for environments is the ordered set of migrations in `supabase/migrations/` (timestamped files) created via `supabase migration new`.



