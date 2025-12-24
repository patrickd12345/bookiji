import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { requireAdmin } from '@/lib/auth/requireAdmin';

/**
 * Admin endpoint to manually trigger KB crawl
 * Uses session-based authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Get session from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    await requireAdmin({ user });

    // Call the cron endpoint internally
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bookiji.com';
    const cronSecret = process.env.VERCEL_CRON_SECRET;
    
    if (!cronSecret) {
      return NextResponse.json(
        { error: 'VERCEL_CRON_SECRET not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${baseUrl}/api/cron/kb-crawl`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { error: 'Crawl trigger failed', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      message: 'KB crawl triggered successfully',
      timestamp: new Date().toISOString(),
      ...data,
    });
  } catch (error) {
    console.error('Error triggering KB crawl:', error);
    return NextResponse.json(
      {
        error: 'Failed to trigger crawl',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}









