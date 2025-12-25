import { NextRequest, NextResponse } from 'next/server'
import { adminGuard } from '@/middleware/adminGuard'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

/**
 * Manually trigger a cron job
 */
export async function POST(request: NextRequest) {
  const guardResult = await adminGuard(request)
  if (guardResult.status !== 200) {
    return guardResult
  }

  try {
    const body = await request.json()
    const { jobId, path } = body

    if (!jobId || !path) {
      return NextResponse.json(
        { error: 'jobId and path are required' },
        { status: 400 }
      )
    }

    // Verify the path is a valid cron endpoint
    const validPaths = [
      '/api/cron/kb-auto-dedupe',
      '/api/cron/kb-crawl',
      '/api/cron/kb-ensure-embeddings',
      '/api/cron/sitemap-refresh',
      '/api/cron/detect-no-shows'
    ]

    if (!validPaths.includes(path)) {
      return NextResponse.json(
        { error: 'Invalid cron job path' },
        { status: 400 }
      )
    }

    const cronSecret = process.env.VERCEL_CRON_SECRET || (process.env.NODE_ENV === 'development' ? 'local-dev-secret' : null)

    if (!cronSecret) {
      return NextResponse.json(
        { error: 'VERCEL_CRON_SECRET not configured' },
        { status: 500 }
      )
    }

    const startTime = Date.now()

    // Use request hostname for subdomain support, fallback to env
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 
                     (process.env.NODE_ENV === 'production' ? 'https' : 'http')
    const baseUrl = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')

    // Trigger the cron job
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`
      }
    })

    const duration = Date.now() - startTime
    const responseData = await response.json().catch(() => ({}))
    const completedAt = new Date().toISOString()
    const status = response.ok ? 'success' : 'error'
    const errorMessage = response.ok ? undefined : (responseData.error || 'Unknown error')

    // Log execution to database
    try {
      const supabase = createSupabaseServerClient()
      
      // Insert execution record
      const { error: execError } = await supabase
        .from('cron_job_executions')
        .insert({
          job_id: jobId,
          job_name: jobId,
          job_path: path,
          started_at: new Date(startTime).toISOString(),
          completed_at: completedAt,
          status: status,
          duration_ms: duration,
          error_message: errorMessage,
          result_data: responseData,
          triggered_by: 'manual'
        })

      if (execError) {
        console.error('Failed to log cron execution:', execError)
      } else {
        // Update job status
        await supabase.rpc('update_cron_job_status', {
          p_job_id: jobId,
          p_status: status,
          p_duration_ms: duration
        })
      }
    } catch (dbError) {
      console.error('Database error logging cron execution:', dbError)
      // Continue even if DB logging fails
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to trigger cron job',
          details: responseData,
          duration
        },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Cron job ${jobId} triggered successfully`,
      duration,
      result: responseData,
      timestamp: completedAt
    })
  } catch (error) {
    console.error('Error triggering cron job:', error)
    return NextResponse.json(
      {
        error: 'Failed to trigger cron job',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

