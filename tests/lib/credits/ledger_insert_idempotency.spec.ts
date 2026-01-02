import { describe, it, expect, vi } from 'vitest';

// Mock supabaseServer to simulate unique violation on insert
vi.mock('@/lib/supabaseServer', () => {
  return {
    getServerSupabase: () => ({
      from: (table: string) => ({
        insert: (_payload: any) => ({
          select: () => ({
            single: async () => {
              return { data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } };
            }
          })
        })
      })
    })
  };
});

import { insertLedgerEntry } from '@/lib/credits/ledger';

describe('insertLedgerEntry idempotency handling', () => {
  it('treats unique constraint violation as idempotent success', async () => {
    const res = await insertLedgerEntry({
      owner_type: 'customer',
      owner_id: 'user-1',
      credit_intent_id: 'intent-1',
      amount_cents: 100,
      reason_code: 'earned',
    });
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
  });
});

