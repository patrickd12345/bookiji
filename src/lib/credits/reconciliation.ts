import { getServerSupabase } from '@/lib/supabaseServer';
import { insertLedgerEntry } from './ledger';
import type { CreditIntent, ReconciliationResult } from '@/types/credits-ledger';

const supabase = getServerSupabase();

export async function reconcileCreditIntents(): Promise<ReconciliationResult> {
  const result: ReconciliationResult = { processed: 0, skipped: 0, errors: [] };
  try {
    // Fetch unreconciled intents deterministically
    const { data: intents, error } = await supabase
      .from('credit_intents')
      .select('*')
      .is('reconciled_at', null)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Failed to fetch credit intents');
    }

    if (!intents || intents.length === 0) return result;

    for (const intent of intents) {
      try {
        // Check existing ledger entry for idempotency
        const { data: existing } = await supabase
          .from('credit_ledger_entries')
          .select('id')
          .eq('credit_intent_id', intent.id)
          .limit(1)
          .single();

        if (existing) {
          result.skipped += 1;
        } else {
          // Insert ledger entry (best-effort). If concurrent run inserts, unique constraint will protect
          const insertRes = await insertLedgerEntry({
            owner_type: intent.owner_type,
            owner_id: intent.owner_id,
            booking_id: intent.booking_id ?? null,
            credit_intent_id: intent.id,
            amount_cents: intent.amount_cents,
            currency: intent.currency ?? 'USD',
            reason_code: (intent.reason_code as any) ?? 'earned',
            metadata: intent.metadata ?? {},
            expires_at: intent.expires_at ?? null,
          });

          if (!insertRes.success) {
            // record error but continue
            result.errors.push({ intent_id: intent.id, error: insertRes.error ?? 'insert_failed' });
            continue;
          }
          result.processed += 1;
        }

        // Mark intent as reconciled if not already
        const { error: updateError } = await supabase
          .from('credit_intents')
          .update({ reconciled_at: new Date().toISOString() })
          .eq('id', intent.id)
          .is('reconciled_at', null);

        if (updateError) {
          // Log but don't fail the whole run
          result.errors.push({ intent_id: intent.id, error: updateError.message || 'failed_to_mark_reconciled' });
        }
      } catch (innerErr: any) {
        result.errors.push({ intent_id: intent.id, error: innerErr?.message ?? String(innerErr) });
      }
    }

    return result;
  } catch (err: any) {
    result.errors.push({ intent_id: 'fetch_intents', error: err?.message ?? String(err) });
    return result;
  }
}

