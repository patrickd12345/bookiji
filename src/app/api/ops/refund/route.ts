// NOTE: Skeleton Next.js 15 route handlers with a consistent envelope
import { NextRequest, NextResponse } from 'next/server';
import { StripeService } from '@/lib/services/stripe';
import { AuditService } from '@/lib/database/outbox';

type RefundRequest = {
  booking_id: string;
  amount_cents?: number;
  reason?: string;
  payment_intent_id?: string;
};

function ok(data: any) { return NextResponse.json({ ok: true, data }); }
function err(code: string, message: string, details?: any, status = 400) {
  const correlation_id = (global as any).__reqId ?? 'dev';
  return NextResponse.json({ ok: false, code, message, details, correlation_id }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RefundRequest;
    if (!body?.booking_id) return err('VALIDATION_ERROR', 'booking_id is required');
    
    // TODO: Get payment_intent_id from booking record if not provided
    if (!body.payment_intent_id) {
      return err('VALIDATION_ERROR', 'payment_intent_id is required for refund processing');
    }

    // Process refund through Stripe
    const refund = await StripeService.processRefund(
      body.payment_intent_id,
      body.amount_cents,
      body.reason || 'Admin refund'
    );

    // Log the refund action
    await AuditService.logAction(
      'refund_processed',
      undefined, // actor_id - would come from auth context
      body.booking_id,
      `Refund processed: ${body.reason || 'Admin refund'}`,
      {
        refund_id: refund.id,
        payment_intent_id: body.payment_intent_id,
        amount_refunded: refund.amount,
        currency: refund.currency,
        reason: body.reason
      }
    );

    return ok({ 
      refund_id: refund.id,
      status: refund.status,
      amount_refunded: refund.amount,
      currency: refund.currency,
      booking_id: body.booking_id,
      message: 'Refund processed successfully'
    });
  } catch (e: any) {
    console.error('Error processing refund:', e);
    return err('INTERNAL_ERROR', e?.message ?? 'Unknown error', undefined, 500);
  }
}
