import { NextRequest, NextResponse } from 'next/server';

/**
 * Cron job endpoint for sitemap refresh
 * Should be called weekly via Vercel Cron (or use local cron scheduler in dev)
 * 
 * This endpoint:
 * 1. Fetches the sitemap to regenerate it (Next.js generates it on-demand)
 * 2. Optionally submits the sitemap to search engines (Google, Bing)
 * 3. Logs the result
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
    const sitemapUrl = `${baseUrl}/sitemap.xml`;
    
    console.log(`[Sitemap Refresh] Starting sitemap refresh at ${new Date().toISOString()}`);
    
    // Fetch the sitemap to trigger regeneration
    const sitemapResponse = await fetch(sitemapUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Bookiji-Sitemap-Refresh/1.0',
      },
      cache: 'no-store', // Force fresh generation
    });

    if (!sitemapResponse.ok) {
      throw new Error(`Failed to fetch sitemap: ${sitemapResponse.status} ${sitemapResponse.statusText}`);
    }

    const sitemapContent = await sitemapResponse.text();
    const sitemapSize = sitemapContent.length;
    const urlCount = (sitemapContent.match(/<url>/g) || []).length;
    
    console.log(`[Sitemap Refresh] Sitemap generated: ${urlCount} URLs, ${sitemapSize} bytes`);

    // Submit to search engines (optional, but recommended)
    const submissions: Array<{ engine: string; success: boolean; message?: string }> = [];

    // Submit to Google Search Console (if API key is configured)
    if (process.env.GOOGLE_SEARCH_CONSOLE_API_KEY) {
      try {
        // Google Search Console sitemap submission via API
        // Note: This requires proper Google Search Console API setup
        // For now, we'll just ping Google's sitemap ping endpoint
        const googlePingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
        const googleResponse = await fetch(googlePingUrl, { method: 'GET' });
        
        submissions.push({
          engine: 'Google',
          success: googleResponse.ok,
          message: googleResponse.ok ? 'Submitted successfully' : `Status: ${googleResponse.status}`
        });
      } catch (error) {
        submissions.push({
          engine: 'Google',
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      submissions.push({
        engine: 'Google',
        success: false,
        message: 'GOOGLE_SEARCH_CONSOLE_API_KEY not configured'
      });
    }

    // Submit to Bing Webmaster Tools (via IndexNow API if configured)
    if (process.env.BING_API_KEY || process.env.INDEXNOW_API_KEY) {
      try {
        // Bing sitemap submission
        const bingPingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
        const bingResponse = await fetch(bingPingUrl, { method: 'GET' });
        
        submissions.push({
          engine: 'Bing',
          success: bingResponse.ok,
          message: bingResponse.ok ? 'Submitted successfully' : `Status: ${bingResponse.status}`
        });
      } catch (error) {
        submissions.push({
          engine: 'Bing',
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      submissions.push({
        engine: 'Bing',
        success: false,
        message: 'BING_API_KEY or INDEXNOW_API_KEY not configured'
      });
    }

    // IndexNow submission (if API key is configured)
    if (process.env.INDEXNOW_API_KEY) {
      try {
        const indexNowUrl = `https://api.indexnow.org/IndexNow`;
        const indexNowResponse = await fetch(indexNowUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: new URL(baseUrl).hostname,
            key: process.env.INDEXNOW_API_KEY,
            keyLocation: `${baseUrl}/api/indexnow-key.txt`,
            urlList: [sitemapUrl]
          })
        });

        submissions.push({
          engine: 'IndexNow',
          success: indexNowResponse.ok,
          message: indexNowResponse.ok ? 'Submitted successfully' : `Status: ${indexNowResponse.status}`
        });
      } catch (error) {
        submissions.push({
          engine: 'IndexNow',
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successfulSubmissions = submissions.filter(s => s.success).length;
    const totalSubmissions = submissions.length;

    return NextResponse.json({
      success: true,
      message: `Sitemap refreshed successfully`,
      timestamp: new Date().toISOString(),
      sitemap: {
        url: sitemapUrl,
        urlCount,
        sizeBytes: sitemapSize,
      },
      searchEngineSubmissions: {
        total: totalSubmissions,
        successful: successfulSubmissions,
        details: submissions,
      },
      note: successfulSubmissions < totalSubmissions 
        ? 'Some search engine submissions failed. Check API keys configuration.'
        : 'All search engine submissions successful.',
    });
  } catch (error) {
    console.error('[Sitemap Refresh] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to refresh sitemap',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}











