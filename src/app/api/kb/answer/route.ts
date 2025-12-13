import { NextRequest } from 'next/server';
import { Kb } from '@/lib/kb/provider';
import { buildCorsHeaders, preflightResponse } from '@/lib/kb/cors';
import { requireApiKey, withCommonHeaders } from '@/lib/kb/request';
import { rateLimit } from '@/lib/kb/limiter';

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflightResponse(origin, 'POST, OPTIONS');
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const cors = buildCorsHeaders(origin, 'POST, OPTIONS');

  if (!(await requireApiKey(process.env.KB_API_KEY))) {
    return withCommonHeaders(new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTH' }), { status: 401, headers: cors }));
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'anon';
  const limit = Number(process.env.KB_RATE_LIMIT_PER_MIN ?? 30);
  if (!rateLimit(`answer:${ip}`, limit)) {
    const res = new Response(JSON.stringify({ error: 'Rate limited', code: 'RATE_LIMIT' }), { status: 429, headers: { ...cors, 'Retry-After': '60' } });
    return withCommonHeaders(res);
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.query) {
    return withCommonHeaders(new Response(JSON.stringify({ error: 'Missing query', code: 'BAD_REQUEST' }), { status: 400, headers: cors }));
  }
  const { query, locale = 'en', section } = body;

  try {
    // Convert legacy params to new interface
    const answerResult = await Kb.answer(query, locale as any, section);
    const data = {
      answer: answerResult.text,
      citations: answerResult.sources.map(s => ({
        id: s.id,
        title: s.title,
        url: s.url || '',
        excerpt: s.snippet
      })),
      followups: ['Check FAQ', 'Contact support']
    };
    const res = new Response(JSON.stringify(data), { status: 200, headers: { ...cors, 'Cache-Control': 'no-store' } });
    return withCommonHeaders(res);
  } catch (e: any) {
    if (e?.message === 'NO_CONTENT') {
      return withCommonHeaders(new Response(JSON.stringify({ error: 'No relevant content', code: 'NO_CONTENT' }), { status: 422, headers: cors }));
    }
    return withCommonHeaders(new Response(JSON.stringify({ error: 'Server error', code: 'SERVER' }), { status: 500, headers: cors }));
  }
}
