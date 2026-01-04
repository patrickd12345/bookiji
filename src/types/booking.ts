import type { Database } from '@/types/supabase'

// Booking lifecycle scope (v1):
// Bookiji guarantees booking mechanics through commitment + handoff.
// After handoff, Bookiji does not manage service outcomes, disputes, or post-booking resolution.

export type RefundStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'

export interface RefundOptions {
  force?: boolean
  reason?: string
  adminId?: string
  idempotencyKey?: string
}

export interface StateTransitionResult {
  success: boolean
  error?: string
  booking?: Database['public']['Tables']['bookings']['Row']
  refundResult?: {
    status: RefundStatus
    amount?: number
    transactionId?: string
    error?: string
  }
}
