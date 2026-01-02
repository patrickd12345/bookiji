/**
 * PaymentIntent Type Definitions
 * 
 * Types for the PaymentIntent entity that links money-moving operations
 * to Credit Ledger intents and bookings.
 */

export type PaymentIntentOwnerType = 'customer' | 'provider';

export type PaymentIntentStatus = 
  | 'created'
  | 'authorized'
  | 'captured'
  | 'refunded'
  | 'cancelled'
  | 'failed';

/**
 * PaymentIntent entity matching the database schema.
 * Every PaymentIntent must be linked to a credit_intent_id from the Credit Ledger.
 */
export interface PaymentIntent {
  id: string; // UUID
  owner_type: PaymentIntentOwnerType;
  owner_id: string; // UUID
  booking_id?: string | null; // UUID
  credit_intent_id: string; // UUID - required, links to credit_ledger_entries
  amount_cents: number;
  currency: string;
  status: PaymentIntentStatus;
  external_provider?: string | null; // e.g. 'stripe'
  external_id?: string | null; // provider's payment_intent id
  idempotency_key?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * Input for creating a new PaymentIntent.
 * credit_intent_id must exist in credit_ledger_entries before creation.
 */
export interface CreatePaymentIntentInput {
  owner_type: PaymentIntentOwnerType;
  owner_id: string;
  booking_id?: string;
  credit_intent_id: string; // Required - must exist in credit_ledger_entries
  amount_cents: number;
  currency?: string;
  external_provider?: string;
  idempotency_key?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating a PaymentIntent.
 * Status transitions are validated by the repository layer.
 */
export interface UpdatePaymentIntentInput {
  status?: PaymentIntentStatus;
  external_id?: string;
  external_provider?: string;
  metadata?: Record<string, unknown>;
}
