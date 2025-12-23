import { NextRequest, NextResponse } from 'next/server';

/**
 * Cron job endpoint for RAG auto-deduplication
 * Should be called hourly via Vercel Cron
 * 
 * This endpoint checks pending KB suggestions against existing KB articles
 * and marks duplicates automatically.
 */
export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron (or local cron scheduler in dev)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.VERCEL_CRON_SECRET || (process.env.NODE_ENV === 'development' ? 'local-dev-secret' : null);
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Call the auto-dedupe endpoint internally
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bookiji.com';
    const adminApiKey = process.env.ADMIN_API_KEY;
    
    if (!adminApiKey) {
      return NextResponse.json(
        { error: 'ADMIN_API_KEY not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${baseUrl}/api/admin/kb/auto_dedupe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { error: 'Auto-dedupe failed', details: errorData },
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
    console.error('Error in KB auto-dedupe cron:', error);
    return NextResponse.json(
      {
        error: 'Failed to run auto-dedupe',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

