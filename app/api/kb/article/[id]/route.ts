import { NextRequest } from 'next/server';
import { Kb } from '@/lib/kb/provider';
import { buildCorsHeaders, preflightResponse } from '@/lib/kb/cors';
import { requireApiKey, withCommonHeaders } from '@/lib/kb/request';
import { rateLimit } from '@/lib/kb/limiter';

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflightResponse(origin, 'GET, OPTIONS');
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get('origin');
  const cors = buildCorsHeaders(origin, 'GET, OPTIONS');

  if (!(await requireApiKey(process.env.KB_API_KEY))) {
    return withCommonHeaders(new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTH' }), { status: 401, headers: cors }));
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'anon';
  const limit = Number(process.env.KB_RATE_LIMIT_PER_MIN ?? 30);
  if (!rateLimit(`article:${ip}`, limit)) {
    const res = new Response(JSON.stringify({ error: 'Rate limited', code: 'RATE_LIMIT' }), { status: 429, headers: { ...cors, 'Retry-After': '60' } });
    return withCommonHeaders(res);
  }

  try {
    const { id } = await params;
    const article = await Kb.getArticle(id, 'en'); // Default to English for now
    if (!article) {
      return withCommonHeaders(new Response(JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' }), { status: 404, headers: cors }));
    }
    // Convert to legacy format for backward compatibility
    const legacyArticle = {
      id: article.id,
      title: article.title,
      url: article.url || '',
      content: article.content
    };
    const res = new Response(JSON.stringify(legacyArticle), { status: 200, headers: { ...cors, 'Cache-Control': 'public, max-age=300' } });
    return withCommonHeaders(res);
  } catch (e: any) {
    if (e?.message === 'NOT_FOUND') {
      return withCommonHeaders(new Response(JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' }), { status: 404, headers: cors }));
    }
    return withCommonHeaders(new Response(JSON.stringify({ error: 'Server error', code: 'SERVER' }), { status: 500, headers: cors }));
  }
}
