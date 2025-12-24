import { NextRequest, NextResponse } from 'next/server'
import { adminGuard } from '@/middleware/adminGuard'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

/**
 * Get execution history for cron jobs
 */
export async function GET(request: NextRequest) {
  const guardResult = await adminGuard(request)
  if (guardResult.status !== 200) {
    return guardResult
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const jobId = searchParams.get('jobId')

    const supabase = createSupabaseServerClient()

    let query = supabase
      .from('cron_job_executions')
      .select('id, job_id, job_name, started_at, completed_at, status, duration_ms, error_message')
      .order('started_at', { ascending: false })
      .limit(limit)

    if (jobId) {
      query = query.eq('job_id', jobId)
    }

    const { data: executions, error } = await query

    if (error) {
      console.error('Error fetching cron history:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch cron history',
          message: error.message
        },
        { status: 500 }
      )
    }

    const history = (executions || []).map(exec => ({
      id: exec.id,
      jobId: exec.job_id,
      jobName: exec.job_name,
      startedAt: exec.started_at,
      completedAt: exec.completed_at || undefined,
      status: exec.status,
      duration: exec.duration_ms || undefined,
      error: exec.error_message || undefined
    }))

    return NextResponse.json({
      success: true,
      history,
      limit,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching cron history:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch cron history',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

