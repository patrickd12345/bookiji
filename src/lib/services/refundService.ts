import { getServerSupabase } from '@/lib/supabaseServer'
import { logger, errorToContext } from '@/lib/logger'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
import { refundPayment } from '@/lib/stripe'
import { type RefundOptions, type RefundStatus } from '@/types/booking'

export async function processRefund(
  bookingId: string,
  options: RefundOptions = {}
): Promise<{ status: RefundStatus; amount?: number; transactionId?: string; error?: string }> {
  try {
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      throw new Error(fetchError?.message || 'Booking not found')
    }

    if (!booking.payment_intent_id) {
      throw new Error('No payment intent found')
    }

    if (booking.refund_status === 'completed') {
      return {
        status: 'completed',
        amount: booking.refund_amount_cents || undefined,
        transactionId: booking.refund_transaction_id || undefined,
      }
    }

    await supabase
      .from('bookings')
      .update({
        refund_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)

    const refund = await refundPayment(
      booking.payment_intent_id,
      undefined,
      options.idempotencyKey || booking.idempotency_key || undefined
    )

    await supabase
      .from('bookings')
      .update({
        refund_status: 'completed',
        refund_amount_cents: refund.amount,
        refund_transaction_id: refund.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)

    return { status: 'completed', amount: refund.amount, transactionId: refund.id }
  } catch (error) {
    logger.error('Refund processing error', { ...errorToContext(error), booking_id: bookingId })

    await supabase
      .from('bookings')
      .update({
        refund_status: 'failed',
        refund_error: error instanceof Error ? error.message : 'Refund processing failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)

    return { status: 'failed', error: error instanceof Error ? error.message : 'Refund processing failed' }
  }
}
