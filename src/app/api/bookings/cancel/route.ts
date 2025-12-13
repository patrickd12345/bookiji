// NOTE: Skeleton Next.js 15 route handlers with a consistent envelope
import { NextRequest, NextResponse } from 'next/server';

type CancelRequest = { quote_id: string };

function ok(data: unknown) { return NextResponse.json({ ok: true, data }); }
function err(code: string, message: string, details?: unknown, status = 400) {
  const correlation_id = (global as { __reqId?: string }).__reqId ?? 'dev';
  return NextResponse.json({ ok: false, code, message, details, correlation_id }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CancelRequest;
    if (!body?.quote_id) return err('VALIDATION_ERROR', 'quote_id is required');
    // TODO: execute domain cancel + refund if needed
    return ok({ cancelled: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return err('INTERNAL_ERROR', message, undefined, 500);
  }
}

