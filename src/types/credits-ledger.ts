export interface CreditLedgerEntry {
  id: string;
  owner_type: 'customer' | 'provider';
  owner_id: string;
  booking_id?: string | null;
  credit_intent_id: string;
  amount_cents: number;
  currency: string;
  reason_code: 'earned' | 'redeemed' | 'expired' | 'forfeited' | 'refunded';
  metadata?: Record<string, unknown>;
  created_at: string;
  expires_at?: string | null;
}

export interface CreditIntent {
  id: string;
  owner_type: 'customer' | 'provider';
  owner_id: string;
  booking_id?: string | null;
  amount_cents: number;
  currency?: string;
  reason_code?: string;
  created_at: string;
  reconciled_at?: string | null;
  expires_at?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ReconciliationResult {
  processed: number;
  skipped: number;
  errors: Array<{ intent_id: string; error: string }>;
}

