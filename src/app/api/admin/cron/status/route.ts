import { NextRequest, NextResponse } from 'next/server'
import { adminGuard } from '@/middleware/adminGuard'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

/**
 * Get status of all cron jobs
 */
export async function GET(request: NextRequest) {
  const guardResult = await adminGuard(request)
  if (guardResult.status !== 200) {
    return guardResult
  }

  try {
    const supabase = createSupabaseServerClient()

    // Get job statuses from database
    const { data: jobStatuses, error: statusError } = await supabase
      .from('cron_job_status')
      .select('*')
      .order('job_id')

    if (statusError) {
      console.error('Error fetching cron job statuses:', statusError)
    }

    // Get latest execution for each job to determine current status
    const { data: latestExecutions, error: execError } = await supabase
      .from('cron_job_executions')
      .select('job_id, status, started_at')
      .order('started_at', { ascending: false })

    if (execError) {
      console.error('Error fetching latest executions:', execError)
    }

    // Build jobs array with status from database
    const defaultJobs = [
      { id: 'kb-auto-dedupe', schedule: '0 * * * *' },
      { id: 'kb-crawl', schedule: '0 2 * * 1' },
      { id: 'kb-ensure-embeddings', schedule: '0 */6 * * *' },
      { id: 'sitemap-refresh', schedule: '0 3 * * 1' },
      { id: 'detect-no-shows', schedule: '0 */4 * * *' }
    ]

    const jobs = defaultJobs.map(job => {
      const status = jobStatuses?.find(s => s.job_id === job.id)
      const latestExec = latestExecutions?.find(e => e.job_id === job.id)

      return {
        id: job.id,
        enabled: status?.enabled ?? true,
        lastRun: status?.last_run_at || null,
        nextRun: status?.next_run_at || null,
        status: latestExec?.status || 'pending',
        executionCount: status?.execution_count || 0,
        errorCount: status?.error_count || 0
      }
    })

    return NextResponse.json({
      success: true,
      jobs,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching cron status:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch cron status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

