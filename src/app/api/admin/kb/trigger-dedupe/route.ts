import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { requireAdmin } from '@/lib/auth/requireAdmin';

/**
 * Admin endpoint to manually trigger RAG auto-deduplication
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

    // Call the auto-dedupe endpoint directly (it already has the logic)
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
    console.error('Error triggering RAG auto-dedupe:', error);
    return NextResponse.json(
      {
        error: 'Failed to trigger auto-dedupe',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}








