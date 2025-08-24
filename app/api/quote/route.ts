// NOTE: Skeleton Next.js 15 route handlers with a consistent envelope
import { NextRequest, NextResponse } from 'next/server';

type QuoteRequest = {
  intent: string;
  location: { lat: number; lon: number };
  when_iso?: string;
};

function ok(data: any) {
  return NextResponse.json({ ok: true, data });
}

function err(code: string, message: string, details?: any, status = 400) {
  const correlation_id = (global as any).__reqId ?? 'dev';
  return NextResponse.json({ ok: false, code, message, details, correlation_id }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as QuoteRequest;
    if (!body?.intent) return err('VALIDATION_ERROR', 'intent is required');
    if (!body?.location) return err('VALIDATION_ERROR', 'location is required');
    const { lat, lon } = body.location;
    if (lat < -90 || lat > 90) return err('VALIDATION_ERROR', 'Latitude must be between -90 and 90', { field: 'location.lat' });
    if (lon < -180 || lon > 180) return err('VALIDATION_ERROR', 'Longitude must be between -180 and 180', { field: 'location.lon' });

    // TODO: call domain service to fetch candidates deterministically
    const quote_id = '00000000-0000-0000-0000-000000000000';
    const candidates = [
      { provider_id: '11111111-1111-1111-1111-111111111111', price_cents: 2500, eta_minutes: 15 }
    ];

    return ok({ quote_id, candidates });
  } catch (e: any) {
    return err('INTERNAL_ERROR', e?.message ?? 'Unknown error', undefined, 500);
  }
}
