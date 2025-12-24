import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

interface LogExecutionParams {
  jobId: string
  jobName: string
  jobPath: string
  startedAt: string
  completedAt: string
  status: 'success' | 'error' | 'running'
  durationMs: number
  errorMessage?: string
  resultData?: unknown
  triggeredBy?: string
}

/**
 * Log cron job execution to database
 */
export async function logCronExecution(params: LogExecutionParams): Promise<void> {
  try {
    const supabase = createSupabaseServerClient()

    // Insert execution record
    const { error: execError } = await supabase
      .from('cron_job_executions')
      .insert({
        job_id: params.jobId,
        job_name: params.jobName,
        job_path: params.jobPath,
        started_at: params.startedAt,
        completed_at: params.completedAt,
        status: params.status,
        duration_ms: params.durationMs,
        error_message: params.errorMessage,
        result_data: params.resultData,
        triggered_by: params.triggeredBy || 'scheduled'
      })

    if (execError) {
      console.error(`Failed to log cron execution for ${params.jobId}:`, execError)
      return
    }

    // Update job status
    const { error: statusError } = await supabase.rpc('update_cron_job_status', {
      p_job_id: params.jobId,
      p_status: params.status,
      p_duration_ms: params.durationMs
    })

    if (statusError) {
      console.error(`Failed to update cron job status for ${params.jobId}:`, statusError)
    }
  } catch (error) {
    console.error(`Error logging cron execution for ${params.jobId}:`, error)
    // Don't throw - logging failures shouldn't break cron jobs
  }
}


