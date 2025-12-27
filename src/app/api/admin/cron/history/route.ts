import { NextRequest, NextResponse } from 'next/server'
import { adminGuard } from '@/middleware/adminGuard'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { requireAdmin } from '@/lib/auth/requireAdmin'

/**
 * Get execution history for cron jobs
 * 
 * AUTHORITATIVE PATH — Admin role verification required
 * See: docs/invariants/admin-ops.md INV-1
 * Note: Uses adminGuard middleware which checks profiles.role === 'admin'
 */
export async function GET(request: NextRequest) {
  // Admin verification via adminGuard (checks profiles.role === 'admin')
  const guardResult = await adminGuard(request)
  if (guardResult.status !== 200) {
    return guardResult
  }
  
  // Additional explicit check for invariant compliance
  const supabase = createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    try {
      await requireAdmin(session)
    } catch {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }
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

