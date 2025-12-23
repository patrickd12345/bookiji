import { NextRequest, NextResponse } from 'next/server';

/**
 * Cron job endpoint for ensuring KB embeddings are vectorized
 * Should be called every 6 hours via Vercel Cron
 * 
 * This endpoint ensures:
 * 1. KB suggestions have embeddings (for auto-deduplication)
 * 2. KB chunks have embeddings (for RAG search)
 */
export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron (or local cron scheduler in dev)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.VERCEL_CRON_SECRET || (process.env.NODE_ENV === 'development' ? 'local-dev-secret' : null);
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bookiji.com';
    const adminApiKey = process.env.ADMIN_API_KEY;
    
    if (!adminApiKey) {
      return NextResponse.json(
        { error: 'ADMIN_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Call the ensure embeddings endpoint
    const response = await fetch(`${baseUrl}/api/admin/kb/ensure_embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { error: 'Ensure embeddings failed', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...data,
    });
  } catch (error) {
    console.error('Error in KB ensure embeddings cron:', error);
    return NextResponse.json(
      {
        error: 'Failed to ensure embeddings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}








