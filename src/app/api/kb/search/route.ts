import { NextRequest } from 'next/server';
import { Kb } from '@/lib/kb/provider';
import { buildCorsHeaders, preflightResponse } from '@/lib/kb/cors';
import { requireApiKey, withCommonHeaders } from '@/lib/kb/request';
import { rateLimit } from '@/lib/kb/limiter';

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflightResponse(origin, 'GET, OPTIONS');
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const cors = buildCorsHeaders(origin, 'GET, OPTIONS');

  if (!(await requireApiKey(process.env.KB_API_KEY))) {
    return withCommonHeaders(new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTH' }), { status: 401, headers: cors }));
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'anon';
  const limit = Number(process.env.KB_RATE_LIMIT_PER_MIN ?? 30);
  if (!rateLimit(`search:${ip}`, limit)) {
    const res = new Response(JSON.stringify({ error: 'Rate limited', code: 'RATE_LIMIT' }), { status: 429, headers: { ...cors, 'Retry-After': '60' } });
    return withCommonHeaders(res);
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q) return withCommonHeaders(new Response(JSON.stringify({ error: 'Missing q', code: 'BAD_REQUEST' }), { status: 400, headers: cors }));
  const locale = (searchParams.get('locale') ?? 'en') as 'en' | 'fr';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const section = searchParams.get('section') as any;
  const limitParam = Number(searchParams.get('limit') ?? 5);

  try {
    // Convert legacy params to new interface
    const searchResults = await Kb.search(q, locale, section, limitParam);
    const result = {
      results: searchResults.map(s => ({
        id: s.id,
        title: s.title,
        url: s.url || '',
        snippet: s.snippet,
        score: s.score
      }))
    };
    const res = new Response(JSON.stringify(result), { status: 200, headers: { ...cors, 'Cache-Control': 'public, max-age=300' } });
    return withCommonHeaders(res);
  } catch {
    return withCommonHeaders(new Response(JSON.stringify({ error: 'Server error', code: 'SERVER' }), { status: 500, headers: cors }));
  }
}
