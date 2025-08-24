// NOTE: Skeleton Next.js 15 route handlers with a consistent envelope
import { NextRequest, NextResponse } from 'next/server';

type ForceCancelRequest = {
  booking_id: string;
  reason: string;
  admin_override?: boolean;
};

function ok(data: any) { return NextResponse.json({ ok: true, data }); }
function err(code: string, message: string, details?: any, status = 400) {
  const correlation_id = (global as any).__reqId ?? 'dev';
  return NextResponse.json({ ok: false, code, message, details, correlation_id }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ForceCancelRequest;
    if (!body?.booking_id) return err('VALIDATION_ERROR', 'booking_id is required');
    if (!body?.reason) return err('VALIDATION_ERROR', 'reason is required');
    
    // TODO: execute domain force-cancel logic + refund if needed
    const cancellation_id = '44444444-4444-4444-4444-444444444444';
    
    return ok({ cancellation_id, status: 'force_cancelled' });
  } catch (e: any) {
    return err('INTERNAL_ERROR', e?.message ?? 'Unknown error', undefined, 500);
  }
}
