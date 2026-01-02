import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabaseServer', () => {
  return {
    getServerSupabase: () => ({
      from: (table: string) => ({
        insert: (payload: any) => ({
          select: () => ({
            single: async () => ({ data: { id: 'new-intent', ...payload }, error: null })
          })
        })
      })
    })
  };
});

import { createForfeitureIntent } from '@/lib/credits/expiry';

describe('createForfeitureIntent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a negative intent for forfeiture', async () => {
    const res = await createForfeitureIntent({
      owner_type: 'customer',
      owner_id: 'user-1',
      original_credit_intent_id: 'orig-1',
      amount_cents: 500,
    });

    expect(res.success).toBe(true);
    expect(res.intent).toBeDefined();
    expect(res.intent?.amount_cents).toBe(-500);
    expect((res.intent as any).metadata?.forfeiture_of).toBe('orig-1');
  });
});

