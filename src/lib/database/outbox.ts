import { createClient } from '@supabase/supabase-js';

// Use local Supabase for development
const supabaseUrl = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_SUPABASE_URL!
  : 'http://localhost:54321';

const supabaseKey = process.env.NODE_ENV === 'production'
  ? process.env.SUPABASE_SERVICE_ROLE_KEY!
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface PaymentOutboxPayload {
  amount: number;
  currency: string;
  payment_intent_id?: string;
  customer_id?: string;
  [key: string]: unknown; // Allow additional fields
}

export interface PaymentOutboxEntry {
  id: string;
  booking_id: string;
  event_type: string;
  idempotency_key: string;
  state: 'queued' | 'in_flight' | 'committed' | 'failed';
  payload: PaymentOutboxPayload;
  created_at: string;
  processed_at?: string;
  error?: string;
}

export interface AuditLogMeta {
  previous_state?: string;
  new_state?: string;
  changes?: Record<string, unknown>;
  [key: string]: unknown; // Allow additional fields
}

export interface AuditLogEntry {
  id: string;
  booking_id?: string;
  actor_id?: string;
  action: string;
  reason?: string;
  meta?: AuditLogMeta;
  created_at: string;
}

export class OutboxService {
  /**
   * Check if a request with the given idempotency key has already been processed
   */
  static async isAlreadyProcessed(idempotencyKey: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('payments_outbox')
      .select('state')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking idempotency:', error);
      return false;
    }

    return data?.state === 'committed';
  }

  /**
   * Create a new outbox entry for payment processing
   */
  static async createOutboxEntry(
    bookingId: string,
    eventType: string,
    idempotencyKey: string,
    payload: PaymentOutboxPayload
  ): Promise<string> {
    const { data, error } = await supabase
      .from('payments_outbox')
      .insert({
        booking_id: bookingId,
        event_type: eventType,
        idempotency_key: idempotencyKey,
        state: 'queued',
        payload
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create outbox entry: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Mark an outbox entry as committed
   */
  static async markCommitted(outboxId: string): Promise<void> {
    const { error } = await supabase
      .from('payments_outbox')
      .update({
        state: 'committed',
        processed_at: new Date().toISOString()
      })
      .eq('id', outboxId);

    if (error) {
      throw new Error(`Failed to mark outbox entry as committed: ${error.message}`);
    }
  }

  /**
   * Mark an outbox entry as failed
   */
  static async markFailed(outboxId: string, errorMessage: string): Promise<void> {
    const { error } = await supabase
      .from('payments_outbox')
      .update({
        state: 'failed',
        error: errorMessage,
        processed_at: new Date().toISOString()
      })
      .eq('id', outboxId);

    if (error) {
      throw new Error(`Failed to mark outbox entry as failed: ${error.message}`);
    }
  }
}

export class AuditService {
  /**
   * Log an action to the audit log
   */
  static async logAction(
    action: string,
    actorId?: string,
    bookingId?: string,
    reason?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meta?: any
  ): Promise<string> {
    const { data, error } = await supabase
      .from('audit_log')
      .insert({
        actor_id: actorId,
        booking_id: bookingId,
        action,
        reason,
        meta
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to log audit entry:', error);
      return 'audit-log-failed';
    }

    return data.id;
  }

  /**
   * Log access to a resource
   */
  static async logAccess(
    subjectId: string,
    actorId: string,
    purpose: string,
    resource: string
  ): Promise<void> {
    const { error } = await supabase
      .from('access_log')
      .insert({
        subject_id: subjectId,
        actor_id: actorId,
        purpose,
        resource
      });

    if (error) {
      console.error('Failed to log access:', error);
    }
  }
}
