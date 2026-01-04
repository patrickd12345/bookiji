'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  Activity,
  Loader2
} from 'lucide-react'
import { logger } from '@/lib/logger'

interface CronJob {
  id: string
  name: string
  path: string
  schedule: string
  description: string
  enabled: boolean
  lastRun?: string
  nextRun?: string
  status?: 'success' | 'error' | 'running' | 'pending'
  executionCount?: number
  errorCount?: number
}

interface ExecutionHistory {
  id: string
  jobId: string
  jobName: string
  startedAt: string
  completedAt?: string
  status: 'success' | 'error' | 'running'
  duration?: number
  error?: string
}

export default function CronManagementPage() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [history, setHistory] = useState<ExecutionHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState<string | null>(null)

  const cronJobs: CronJob[] = [
    {
      id: 'kb-auto-dedupe',
      name: 'KB Auto-Deduplication',
      path: '/api/cron/kb-auto-dedupe',
      schedule: '0 * * * *',
      description: 'Automatically detects and marks duplicate KB suggestions. Runs hourly.',
      enabled: true
    },
    {
      id: 'kb-crawl',
      name: 'KB Crawl',
      path: '/api/cron/kb-crawl',
      schedule: '0 2 * * 1',
      description: 'Crawls and indexes the knowledge base. Runs weekly on Mondays at 2 AM UTC.',
      enabled: true
    },
    {
      id: 'kb-ensure-embeddings',
      name: 'KB Ensure Embeddings',
      path: '/api/cron/kb-ensure-embeddings',
      schedule: '0 */6 * * *',
      description: 'Ensures KB articles are vectorized for RAG search. Runs every 6 hours.',
      enabled: true
    },
    {
      id: 'sitemap-refresh',
      name: 'Sitemap Refresh',
      path: '/api/cron/sitemap-refresh',
      schedule: '0 3 * * 1',
      description: 'Refreshes sitemap and submits to search engines. Runs weekly on Mondays at 3 AM UTC.',
      enabled: true
    }
  ]

  useEffect(() => {
    loadCronStatus()
    loadExecutionHistory()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCronStatus = async () => {
    try {
      const response = await fetch('/api/admin/cron/status')
      if (response.ok) {
        const data = await response.json()
        // Merge with default jobs and update status
        const updatedJobs = cronJobs.map(job => {
          const statusData = data.jobs?.find((j: CronJob) => j.id === job.id)
          return {
            ...job,
            ...statusData,
            enabled: statusData?.enabled ?? job.enabled
          }
        })
        setJobs(updatedJobs)
      } else {
        setJobs(cronJobs)
      }
    } catch (error) {
      logger.error('Failed to load cron status:', { error })
      setJobs(cronJobs)
    } finally {
      setLoading(false)
    }
  }

  const loadExecutionHistory = async () => {
    try {
      const response = await fetch('/api/admin/cron/history?limit=50')
      if (response.ok) {
        const data = await response.json()
        setHistory(data.history || [])
      }
    } catch (error) {
      logger.error('Failed to load execution history:', { error })
    }
  }

  const triggerJob = async (jobId: string, path: string) => {
    setTriggering(jobId)
    try {
      const response = await fetch('/api/admin/cron/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, path })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`${jobId} has been triggered successfully`)
        // Reload status and history
        await loadCronStatus()
        await loadExecutionHistory()
      } else {
        alert(data.error || 'Failed to trigger job')
      }
    } catch (_error) {
      alert('Failed to trigger job')
    } finally {
      setTriggering(null)
    }
  }

  const formatSchedule = (schedule: string) => {
    // Convert cron expression to human-readable format
    const parts = schedule.split(' ')
    if (parts.length !== 5) return schedule

    const [_minute, _hour, _day, _month, _weekday] = parts

    if (schedule === '0 * * * *') return 'Every hour'
    if (schedule === '0 */6 * * *') return 'Every 6 hours'
    if (schedule === '0 2 * * 1') return 'Weekly (Mondays 2 AM UTC)'
    if (schedule === '0 3 * * 1') return 'Weekly (Mondays 3 AM UTC)'

    return schedule
  }

  const getStatusBadge = (job: CronJob) => {
    if (!job.status) return null
    
    switch (job.status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  const getHistoryStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Cron Job Management</h1>
        <p className="mt-2 text-gray-600">
          Manage scheduled tasks and monitor execution history
        </p>
      </div>

      {/* Cron Jobs List */}
      <div className="grid gap-4">
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{job.name}</CardTitle>
                    {getStatusBadge(job)}
                    {job.enabled ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                        Disabled
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mt-2">{job.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => triggerJob(job.id, job.path)}
                    disabled={triggering === job.id || !job.enabled}
                    size="sm"
                    variant="outline"
                  >
                    {triggering === job.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Trigger Now
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Schedule:</span>
                  <span className="font-mono text-gray-900">{formatSchedule(job.schedule)}</span>
                </div>
                {job.lastRun && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Last Run:</span>
                    <span className="text-gray-900">
                      {new Date(job.lastRun).toLocaleString()}
                    </span>
                  </div>
                )}
                {job.nextRun && (
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Next Run:</span>
                    <span className="text-gray-900">
                      {new Date(job.nextRun).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              {job.executionCount !== undefined && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">
                      Executions: <span className="font-semibold text-gray-900">{job.executionCount}</span>
                    </span>
                    {job.errorCount !== undefined && job.errorCount > 0 && (
                      <span className="text-red-600">
                        Errors: <span className="font-semibold">{job.errorCount}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Execution History */}
      <Card>
        <CardHeader>
          <CardTitle>Execution History</CardTitle>
          <CardDescription>Recent cron job executions</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No execution history yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Job</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Started</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Duration</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((execution) => (
                    <tr key={execution.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{execution.jobName}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(execution.startedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {execution.duration ? `${execution.duration}ms` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getHistoryStatusIcon(execution.status)}
                          <span className="text-sm capitalize">{execution.status}</span>
                        </div>
                        {execution.error && (
                          <div className="mt-1 text-xs text-red-600">{execution.error}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

