import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/credits/ledger', async () => {
  const original = await vi.importActual<any>('@/lib/credits/ledger');
  return {
    ...original,
    fetchLedgerEntries: vi.fn(async (owner_type: any, owner_id: any) => {
      const now = new Date();
      return [
        { id: 'a', owner_type, owner_id, amount_cents: 1000, created_at: now.toISOString(), credit_intent_id: 'i1', currency: 'USD', reason_code: 'earned', expires_at: null },
        { id: 'b', owner_type, owner_id, amount_cents: -200, created_at: now.toISOString(), credit_intent_id: 'i2', currency: 'USD', reason_code: 'forfeited', expires_at: null },
        { id: 'c', owner_type, owner_id, amount_cents: 500, created_at: now.toISOString(), credit_intent_id: 'i3', currency: 'USD', reason_code: 'earned', expires_at: new Date(now.getTime() - 1000).toISOString() }, // expired
      ];
    }),
  };
});

import { getCreditBalance } from '@/lib/credits/ledger';

describe('getCreditBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sums non-expired entries and includes negative forfeitures', async () => {
    const balance = await getCreditBalance('customer', 'user-1');
    // entries: 1000 + (-200) + (expired 500 ignored) => 800
    expect(balance).toBe(800);
  });
});

