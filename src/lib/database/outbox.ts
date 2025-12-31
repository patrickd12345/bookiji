import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey } from '@/lib/env/supabaseEnv';

const supabase = createClient(getSupabaseUrl(), getSupabaseServiceKey());

export interface PaymentOutboxEntry {
  id: string;
  booking_id: string;
  event_type: string;
  idempotency_key: string;
  state: 'queued' | 'in_flight' | 'committed' | 'failed';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  created_at: string;
  processed_at?: string;
  error?: string;
}

export interface AuditLogEntry {
  id: string;
  booking_id?: string;
  actor_id?: string;
  action: string;
  reason?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: any;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any
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
