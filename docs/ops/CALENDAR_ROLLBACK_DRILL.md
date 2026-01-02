# Calendar Migration Rollback Drill

Date: 2026-01-02
Operator: Automated agent

## Objective

Verify rollback procedures for calendar migrations and ensure re-application is idempotent.

## Steps

1. Run rollback scripts from `docs/ops/calendar_migration_rollback_scripts.sql` in reverse order:
   - Rollback Migration 4 (operational enablement)
   - Rollback Migration 3 (outbound sync)
   - Rollback Migration 2 (uniqueness fix)
   - Rollback Migration 1 (foundations)
2. Verify objects dropped/columns removed as expected.
3. Re-apply migrations using `supabase db push`.
4. Verify post-migration queries again.

## Notes

- This drill is intended for staging/local environments only.
- Operators must ensure backups exist if data loss is a concern.

