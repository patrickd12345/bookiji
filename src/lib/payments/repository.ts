/**
 * PaymentIntent Repository
 * 
 * Provides type-safe, idempotent database operations for PaymentIntent
 * with safe status transition logic.
 */

import { getServerSupabase } from '@/lib/supabaseServer';
import type { 
  PaymentIntent, 
  CreatePaymentIntentInput, 
  UpdatePaymentIntentInput,
  PaymentIntentStatus 
} from '@/types/payments';

const supabase = getServerSupabase();

/**
 * Valid status transitions map.
 * Key is current status, value is array of allowed next statuses.
 */
const VALID_TRANSITIONS: Record<PaymentIntentStatus, PaymentIntentStatus[]> = {
  created: ['authorized', 'cancelled', 'failed'],
  authorized: ['captured', 'cancelled', 'failed'],
  captured: ['refunded'], // Only forward transition
  refunded: [], // Terminal state
  cancelled: [], // Terminal state
  failed: [], // Terminal state
};

/**
 * Check if a status transition is valid.
 */
function isValidTransition(from: PaymentIntentStatus, to: PaymentIntentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Insert a new PaymentIntent (idempotent).
 * If idempotency_key is provided and exists, returns the existing record.
 * 
 * @throws Error if credit_intent_id doesn't exist in credit_ledger_entries
 */
export async function insertPaymentIntent(
  input: CreatePaymentIntentInput
): Promise<{ success: boolean; paymentIntent?: PaymentIntent; error?: string }> {
  try {
    // Check for existing PaymentIntent with same idempotency_key
    if (input.idempotency_key) {
      const { data: existing } = await supabase
        .from<PaymentIntent>('payment_intents')
        .select('*')
        .eq('idempotency_key', input.idempotency_key)
        .maybeSingle();

      if (existing) {
        return { success: true, paymentIntent: existing };
      }
    }

    // Verify credit_intent_id exists in credit_ledger_entries
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from('credit_ledger_entries')
      .select('credit_intent_id')
      .eq('credit_intent_id', input.credit_intent_id)
      .maybeSingle();

    if (ledgerError || !ledgerEntry) {
      return { 
        success: false, 
        error: `credit_intent_id ${input.credit_intent_id} does not exist in credit_ledger_entries` 
      };
    }

    // Insert new PaymentIntent
    const payload = {
      owner_type: input.owner_type,
      owner_id: input.owner_id,
      booking_id: input.booking_id ?? null,
      credit_intent_id: input.credit_intent_id,
      amount_cents: input.amount_cents,
      currency: input.currency ?? 'USD',
      status: 'created' as PaymentIntentStatus,
      external_provider: input.external_provider ?? null,
      idempotency_key: input.idempotency_key ?? null,
      metadata: input.metadata ?? {},
    };

    const { data, error } = await supabase
      .from<PaymentIntent>('payment_intents')
      .insert(payload)
      .select()
      .single();

    if (error) {
      // Handle unique constraint violations (idempotency)
      const isUniqueViolation = /unique/i.test(error.message || '') || (error.code === '23505');
      if (isUniqueViolation && input.idempotency_key) {
        // Retry fetch by idempotency_key
        const { data: existing } = await supabase
          .from<PaymentIntent>('payment_intents')
          .select('*')
          .eq('idempotency_key', input.idempotency_key)
          .maybeSingle();
        
        if (existing) {
          return { success: true, paymentIntent: existing };
        }
      }
      return { success: false, error: error.message || String(error) };
    }

    return { success: true, paymentIntent: data };
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

/**
 * Find PaymentIntent by external provider ID.
 * Used by webhook handlers to resolve PaymentIntent from Stripe events.
 */
export async function findByExternalId(
  provider: string,
  externalId: string
): Promise<PaymentIntent | null> {
  const { data, error } = await supabase
    .from<PaymentIntent>('payment_intents')
    .select('*')
    .eq('external_provider', provider)
    .eq('external_id', externalId)
    .maybeSingle();

  if (error) {
    console.error('Error finding PaymentIntent by external ID:', error);
    return null;
  }

  return data ?? null;
}

/**
 * Find PaymentIntent by UUID.
 */
export async function findById(id: string): Promise<PaymentIntent | null> {
  const { data, error } = await supabase
    .from<PaymentIntent>('payment_intents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error finding PaymentIntent by ID:', error);
    return null;
  }

  return data ?? null;
}

/**
 * Update PaymentIntent status with safe transition validation.
 * 
 * @throws Error if transition is invalid
 */
export async function updateStatus(
  id: string,
  newStatus: PaymentIntentStatus,
  opts?: { external_id?: string; external_provider?: string; metadata?: Record<string, unknown> }
): Promise<{ success: boolean; paymentIntent?: PaymentIntent; error?: string }> {
  try {
    // Get current PaymentIntent
    const current = await findById(id);
    if (!current) {
      return { success: false, error: `PaymentIntent ${id} not found` };
    }

    // Validate transition
    if (!isValidTransition(current.status, newStatus)) {
      return { 
        success: false, 
        error: `Invalid status transition from ${current.status} to ${newStatus}` 
      };
    }

    // Build update payload
    const updatePayload: Partial<PaymentIntent> = {
      status: newStatus,
    };

    if (opts?.external_id) {
      updatePayload.external_id = opts.external_id;
    }
    if (opts?.external_provider) {
      updatePayload.external_provider = opts.external_provider;
    }
    if (opts?.metadata) {
      updatePayload.metadata = { ...current.metadata, ...opts.metadata };
    }

    const { data, error } = await supabase
      .from<PaymentIntent>('payment_intents')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message || String(error) };
    }

    return { success: true, paymentIntent: data };
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

/**
 * Mark PaymentIntent as captured.
 * Helper for capture operations.
 */
export async function markCaptured(
  id: string,
  captureId?: string
): Promise<{ success: boolean; paymentIntent?: PaymentIntent; error?: string }> {
  return updateStatus(id, 'captured', {
    metadata: captureId ? { capture_id: captureId } : undefined,
  });
}

/**
 * Mark PaymentIntent as refunded.
 * Helper for refund operations.
 */
export async function markRefunded(
  id: string,
  refundId?: string
): Promise<{ success: boolean; paymentIntent?: PaymentIntent; error?: string }> {
  return updateStatus(id, 'refunded', {
    metadata: refundId ? { refund_id: refundId } : undefined,
  });
}
