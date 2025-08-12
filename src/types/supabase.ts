export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bookings: {
        Row: {
          id: string
          customer_id: string
          vendor_id: string
          service_id: string
          slot_id: string
          slot_start: string
          slot_end: string
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          commitment_fee_paid: boolean
          vendor_fee_paid: boolean
          total_amount_cents: number
          payment_intent_id?: string
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          cancellation_reason?: string
          cancelled_at?: string
          refunded_at?: string
          notes?: string
          created_at: string
          updated_at: string
          refund_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
          refund_amount_cents?: number
          refund_transaction_id?: string
          refund_error?: string
          admin_override?: boolean
          admin_override_reason?: string
          admin_override_by?: string
        }
        Insert: {
          id?: string
          customer_id: string
          vendor_id: string
          service_id: string
          slot_id: string
          slot_start: string
          slot_end: string
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          commitment_fee_paid?: boolean
          vendor_fee_paid?: boolean
          total_amount_cents: number
          payment_intent_id?: string
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          cancellation_reason?: string
          cancelled_at?: string
          refunded_at?: string
          notes?: string
          created_at?: string
          updated_at?: string
          refund_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
          refund_amount_cents?: number
          refund_transaction_id?: string
          refund_error?: string
          admin_override?: boolean
          admin_override_reason?: string
          admin_override_by?: string
        }
        Update: {
          id?: string
          customer_id?: string
          vendor_id?: string
          service_id?: string
          slot_id?: string
          slot_start?: string
          slot_end?: string
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          commitment_fee_paid?: boolean
          vendor_fee_paid?: boolean
          total_amount_cents?: number
          payment_intent_id?: string
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          cancellation_reason?: string
          cancelled_at?: string
          refunded_at?: string
          notes?: string
          created_at?: string
          updated_at?: string
          refund_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
          refund_amount_cents?: number
          refund_transaction_id?: string
          refund_error?: string
          admin_override?: boolean
          admin_override_reason?: string
          admin_override_by?: string
        }
      }
      booking_state_changes: {
        Row: {
          id: string
          booking_id: string
          from_status: string | null
          to_status: string
          changed_by: string | null
          reason: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          from_status?: string | null
          to_status: string
          changed_by?: string | null
          reason?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          from_status?: string | null
          to_status?: string
          changed_by?: string | null
          reason?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_cancellation_refundable: {
        Args: {
          booking_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
