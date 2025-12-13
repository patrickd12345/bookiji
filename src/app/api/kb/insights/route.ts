import { NextRequest } from 'next/server';
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

  // API Key validation
  if (!(await requireApiKey(process.env.KB_API_KEY))) {
    return withCommonHeaders(new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTH' }), { status: 401, headers: cors }));
  }

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') ?? 'anon';
  const limit = Number(process.env.KB_RATE_LIMIT_PER_MIN ?? 30);
  if (!rateLimit(`insights:${ip}`, limit)) {
    const res = new Response(JSON.stringify({ error: 'Rate limited', code: 'RATE_LIMIT' }), { status: 429, headers: { ...cors, 'Retry-After': '60' } });
    return withCommonHeaders(res);
  }

  try {
    const { searchParams } = new URL(req.url);
    const insightType = searchParams.get('type') || 'overview';

    // For now, return mock insights data
    // In production, you'd query your database views
    let insights;
    
    switch (insightType) {
      case 'gaps':
        insights = {
          type: 'gaps',
          data: [
            {
              query: "How do I connect my calendar?",
              locale: "en",
              n: 15,
              helpfulRate: 0.2,
              lastSeen: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              query: "Payment method not working",
              locale: "en", 
              n: 8,
              helpfulRate: 0.25,
              lastSeen: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            }
          ]
        };
        break;
        
      case 'articles-needing-love':
        insights = {
          type: 'articles_needing_love',
          data: [
            {
              id: 'faq-holds-001',
              title: 'About the $1 Hold',
              section: 'faq',
              locale: 'en',
              feedbackCount: 12,
              helpfulRate: 0.42
            }
          ]
        };
        break;
        
      case 'overrides':
        insights = {
          type: 'high_signal_overrides',
          data: [
            {
              id: 'override-001',
              query: "Calendar sync issues",
              locale: "en",
              overrideText: "To sync your calendar, go to Settings > Integrations > Calendar and follow the OAuth flow. Make sure to grant all necessary permissions.",
              overrideAuthor: "support_agent_01",
              articleTitle: "Calendar Integration Guide",
              articleSection: "faq",
              createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
            }
          ]
        };
        break;
        
      default: // overview
        insights = {
          type: 'overview',
          data: {
            totalArticles: 4,
            totalFeedback: 47,
            avgHelpfulRate: 0.78,
            topPerformingSection: 'faq',
            recentGaps: 3,
            articlesNeedingLove: 1,
            highSignalOverrides: 2
          }
        };
    }

    const res = new Response(JSON.stringify(insights), { 
      status: 200, 
      headers: { 
        ...cors, 
        'Cache-Control': 'public, max-age=300' // Cache insights for 5 minutes
      } 
    });
    
    return withCommonHeaders(res);

  } catch (e: any) {
    console.error('Insights API error:', e);
    return withCommonHeaders(new Response(JSON.stringify({ error: 'Server error', code: 'SERVER' }), { status: 500, headers: cors }));
  }
}
