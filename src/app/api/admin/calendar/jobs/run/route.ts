import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { isJobsEnabled } from '@/lib/calendar-sync/flags'
import { runSyncJob } from '@/lib/calendar-sync/jobs/run-sync-job'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

export async function POST(request: NextRequest) {
  try {
    // Admin auth check
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await requireAdmin({ user })

    // Check feature flag
    const body = await request.json().catch(() => ({}))
    const { provider_id, connection_id, window } = body

    if (!isJobsEnabled(provider_id, connection_id)) {
      return NextResponse.json(
        { error: 'Calendar jobs are not enabled' },
        { status: 403 }
      )
    }

    // Parse window if provided
    let windowParsed: { start: Date; end: Date } | undefined
    if (window) {
      windowParsed = {
        start: new Date(window.start),
        end: new Date(window.end),
      }
    }

    // Run sync job
    const summary = await runSyncJob({
      connection_id,
      provider_id,
      window: windowParsed,
    })

    return NextResponse.json({
      success: true,
      summary,
      run_by: adminUser.email,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    console.error('Error running calendar sync job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
