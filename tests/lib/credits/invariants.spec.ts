import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('credits ledger invariants (migration checks)', () => {
  it('migration contains append-only trigger and function', () => {
    const sql = readFileSync('supabase/migrations/20260121000000_credit_ledger_schema.sql', 'utf8');
    expect(sql).toContain('prevent_credit_ledger_modifications');
    expect(sql).toContain('trg_prevent_credit_ledger_mods');
    expect(sql).toContain('CONSTRAINT credit_intent_unique');
  });
});

