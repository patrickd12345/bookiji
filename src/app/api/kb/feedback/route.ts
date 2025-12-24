import { NextRequest } from 'next/server';
import { buildCorsHeaders, preflightResponse } from '@/lib/kb/cors';
import { requireApiKey, withCommonHeaders } from '@/lib/kb/request';
import { rateLimit } from '@/lib/kb/limiter';
import { KBFeedbackIn, KBFeedbackOut } from '@/lib/kb/types';

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflightResponse(origin, 'POST, OPTIONS');
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const cors = buildCorsHeaders(origin, 'POST, OPTIONS');

  // API Key validation
  if (!(await requireApiKey(process.env.KB_API_KEY))) {
    return withCommonHeaders(new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTH' }), { status: 401, headers: cors }));
  }

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') ?? 'anon';
  const limit = Number(process.env.KB_RATE_LIMIT_PER_MIN ?? 30);
  if (!rateLimit(`feedback:${ip}`, limit)) {
    const res = new Response(JSON.stringify({ error: 'Rate limited', code: 'RATE_LIMIT' }), { status: 429, headers: { ...cors, 'Retry-After': '60' } });
    return withCommonHeaders(res);
  }

  try {
    // Parse and validate input
    let body: KBFeedbackIn;
    try {
      body = await req.json();
    } catch {
      return withCommonHeaders(new Response(JSON.stringify({ error: 'Invalid JSON', code: 'INVALID_JSON' }), { status: 400, headers: cors }));
    }

    // Basic validation
    if (!body.query || body.query.trim().length < 2) {
      return withCommonHeaders(new Response(JSON.stringify({ error: 'Query is required and must be at least 2 characters', code: 'INVALID_QUERY' }), { status: 400, headers: cors }));
    }

    const locale = body.locale?.toLowerCase();
    if (!locale || !['en', 'fr'].includes(locale)) {
      return withCommonHeaders(new Response(JSON.stringify({ error: 'Locale must be "en" or "fr"', code: 'INVALID_LOCALE' }), { status: 400, headers: cors }));
    }

    if (body.sectionBias && !['faq', 'vendor', 'policy', 'troubleshooting'].includes(body.sectionBias)) {
      return withCommonHeaders(new Response(JSON.stringify({ error: 'Invalid section bias', code: 'INVALID_SECTION' }), { status: 400, headers: cors }));
    }

    // Generate request ID if not provided
    const requestId = body.requestId || req.headers.get('x-request-id') || crypto.randomUUID();

    // For now, we'll simulate database insertion
    // In production, you'd insert into your kb_feedback table
    const feedbackId = crypto.randomUUID();
    const receivedAt = new Date().toISOString();

    // Log feedback for debugging (remove in production)
    console.log('KB Feedback received:', {
      id: feedbackId,
      query: body.query,
      locale: body.locale,
      helpful: body.helpful,
      clicked: body.clicked,
      overrideText: body.overrideText ? '***OVERRIDE***' : 'none',
      client: body.client || 'unknown'
    });

    const payload: KBFeedbackOut = {
      ok: true,
      id: feedbackId,
      receivedAt
    };

    const res = new Response(JSON.stringify(payload), { 
      status: 200, 
      headers: { 
        ...cors, 
        'Cache-Control': 'no-store',
        'X-Request-Id': requestId
      } 
    });
    
    return withCommonHeaders(res);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error('Feedback API error:', e);
    return withCommonHeaders(new Response(JSON.stringify({ error: 'Server error', code: 'SERVER' }), { status: 500, headers: cors }));
  }
}
