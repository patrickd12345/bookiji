import type { Database } from '@/types/supabase'

export type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'confirmed'
  | 'completed'
  | 'no_show'
  | 'cancelled'

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
