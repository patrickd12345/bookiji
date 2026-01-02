# Credits Reconciliation — Ledger Design Summary

Purpose: implement an append-only credit ledger, deterministic reconciliation from CreditIntent records, expiry/forfeiture semantics, and balance derivation without storing balances.

Key points:
- Ledger table: `credit_ledger_entries` (append-only, unique `credit_intent_id`) — stores every credit change as an immutable record.
- Reconciliation: `reconcileCreditIntents()` reads unreconciled `credit_intents` in deterministic order, inserts ledger entries idempotently, and marks intents reconciled.
- Expiry: credits have `expires_at`; expired entries remain in the ledger but are excluded from balance calculations.
- Forfeiture: implemented by creating negative `CreditIntent` records (reason 'forfeited') which are reconciled into negative ledger entries — never delete or mutate existing ledger entries.
- Balance derivation: `getCreditBalance(owner)` sums non-expired ledger entries for the owner; no balances are stored.
- Invariants:
  - Append-only ledger (DB trigger prevents UPDATE/DELETE)
  - Reconciliation is idempotent (unique constraint on `credit_intent_id` + existence checks)
  - Same inputs produce same balances (deterministic ordering and pure aggregation)

Files added:
- `supabase/migrations/20260121000000_credit_ledger_schema.sql` — migration
- `src/lib/credits/ledger.ts` — ledger helpers and balance derivation
- `src/lib/credits/reconciliation.ts` — reconciliation engine
- `src/lib/credits/expiry.ts` — forfeiture intent creator
- `src/types/credits-ledger.ts` — TypeScript types
- `tests/lib/credits/*` — unit/integration tests proving core invariants

