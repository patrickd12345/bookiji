import { getServerSupabase } from '@/lib/supabaseServer';
import type { CreditIntent } from '@/types/credits-ledger';

const supabase = getServerSupabase();

export async function createForfeitureIntent(params: {
  owner_type: 'customer' | 'provider';
  owner_id: string;
  original_credit_intent_id?: string;
  amount_cents: number;
  currency?: string;
  reason?: string;
  expires_at?: string | null;
}): Promise<{ success: boolean; intent?: CreditIntent; error?: string }> {
  try {
    const payload: Partial<CreditIntent> = {
      owner_type: params.owner_type,
      owner_id: params.owner_id,
      booking_id: null,
      amount_cents: -Math.abs(params.amount_cents),
      currency: params.currency ?? 'USD',
      reason_code: params.reason ?? 'forfeited',
      created_at: new Date().toISOString(),
      reconciled_at: null,
      expires_at: params.expires_at ?? null,
      metadata: {
        forfeiture_of: params.original_credit_intent_id ?? null,
      } as any,
    };

    const { data, error } = await supabase
      .from<CreditIntent>('credit_intents')
      .insert(payload)
      .select()
      .single();

    if (error) return { success: false, error: error.message || String(error) };
    return { success: true, intent: data as CreditIntent };
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

