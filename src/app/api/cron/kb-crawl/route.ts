import { NextRequest, NextResponse } from 'next/server';

/**
 * Cron job endpoint for KB crawling
 * Should be called weekly via Vercel Cron (or use GitHub Actions workflow)
 * 
 * Note: This endpoint triggers the crawl process. For production, you can either:
 * 1. Use this Vercel cron endpoint (configured in vercel.json)
 * 2. Use the GitHub Actions workflow (.github/workflows/support-kb-crawler.yml) which runs weekly
 * 
 * The GitHub Actions approach is recommended as it has better timeout handling
 * and doesn't consume Vercel function execution time.
 */
export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron (or local cron scheduler in dev)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.VERCEL_CRON_SECRET || (process.env.NODE_ENV === 'development' ? 'local-dev-secret' : null);
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Note: The actual crawl logic is in scripts/crawl-kb.ts
    // For Vercel serverless functions, we'd need to refactor the crawl logic
    // into a reusable function. For now, this endpoint serves as a placeholder.
    // 
    // The GitHub Actions workflow (.github/workflows/support-kb-crawler.yml)
    // is already configured to run weekly and handles the crawl properly.
    
    return NextResponse.json({
      success: true,
      message: 'KB crawl endpoint - use GitHub Actions workflow for actual crawling',
      note: 'The crawl script (scripts/crawl-kb.ts) should be run via GitHub Actions or refactored for serverless execution',
      timestamp: new Date().toISOString(),
      github_actions_workflow: '.github/workflows/support-kb-crawler.yml',
      schedule: 'Weekly (Mondays 2 AM UTC)',
    });
  } catch (error) {
    console.error('Error in KB crawl cron:', error);
    return NextResponse.json(
      {
        error: 'Failed to process crawl request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
