import { getServerSupabase } from '@/lib/supabaseServer';
import type { CreditLedgerEntry } from '@/types/credits-ledger';

const supabase = getServerSupabase();

export async function insertLedgerEntry(entry: Partial<CreditLedgerEntry>): Promise<{ success: boolean; entry?: CreditLedgerEntry; error?: string }> {
  try {
    const payload = {
      owner_type: entry.owner_type,
      owner_id: entry.owner_id,
      booking_id: entry.booking_id ?? null,
      credit_intent_id: entry.credit_intent_id,
      amount_cents: entry.amount_cents,
      currency: entry.currency ?? 'USD',
      reason_code: entry.reason_code ?? 'earned',
      metadata: entry.metadata ?? {},
      expires_at: entry.expires_at ?? null,
    };

    const { data, error } = await supabase
      .from('credit_ledger_entries')
      .insert(payload)
      .select()
      .single();

    if (error) {
      // If unique constraint on credit_intent_id prevents insertion, treat as idempotent
      const isUniqueViolation = /unique/i.test(error.message || '') || (error.code === '23505');
      if (isUniqueViolation) {
        return { success: true }; // already present
      }
      return { success: false, error: error.message || String(error) };
    }

    return { success: true, entry: data };
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

export async function fetchLedgerEntries(owner_type: 'customer' | 'provider', owner_id: string): Promise<CreditLedgerEntry[]> {
  const { data, error } = await supabase
    .from('credit_ledger_entries')
    .select('*')
    .eq('owner_type', owner_type)
    .eq('owner_id', owner_id)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to fetch ledger entries');
  }
  return data || [];
}

export async function getCreditBalance(owner_type: 'customer' | 'provider', owner_id: string): Promise<number> {
  const entries = await fetchLedgerEntries(owner_type, owner_id);
  const now = new Date();
  const sum = entries.reduce((acc, e) => {
    if (e.expires_at && new Date(e.expires_at) <= now) return acc;
    return acc + e.amount_cents;
  }, 0);
  return sum;
}

