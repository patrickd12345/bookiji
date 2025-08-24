// NOTE: Skeleton Next.js 15 route handlers with a consistent envelope
import { NextRequest, NextResponse } from 'next/server';

type ConfirmRequest = {
  quote_id: string;
  provider_id: string;
  idempotency_key: string;
  stripe_payment_intent_id: string;
};

function ok(data: any) { return NextResponse.json({ ok: true, data }); }
function err(code: string, message: string, details?: any, status = 400) {
  const correlation_id = (global as any).__reqId ?? 'dev';
  return NextResponse.json({ ok: false, code, message, details, correlation_id }, { status });
}

async function alreadyProcessed(idempotency_key: string): Promise<boolean> {
  // TODO: query payments_outbox by idempotency_key
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ConfirmRequest;
    if (!body?.idempotency_key) return err('VALIDATION_ERROR', 'idempotency_key is required');
    if (await alreadyProcessed(body.idempotency_key)) {
      return err('IDEMPOTENT_DUPLICATE', 'Request already applied', { idempotency_key: body.idempotency_key }, 409);
    }

    // TODO: enqueue outbox event; handle Stripe confirmation via worker
    const booking_id = '22222222-2222-2222-2222-222222222222';
    const receipt_url = 'https://example.com/receipt/' + booking_id;

    return ok({ booking_id, receipt_url });
  } catch (e: any) {
    return err('INTERNAL_ERROR', e?.message ?? 'Unknown error', undefined, 500);
  }
}
