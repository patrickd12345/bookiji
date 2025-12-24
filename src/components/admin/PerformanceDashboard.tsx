'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Loader2, TrendingUp, TrendingDown, Activity, Clock, AlertTriangle, Zap, Database, Globe } from 'lucide-react'

interface PerformanceData {
  five_minute_bucket: string
  endpoint: string
  request_count: number
  avg_response_time_ms: number
  p95_response_time_ms: number
  p99_response_time_ms: number
  cache_hit_rate: number
  database_queries: number
}

interface ApiMetrics {
  bucket: string
  endpoint: string
  reqs: number
  p95_ms: number
  p99_ms: number
  err_rate: number
}

interface CurrentMetrics {
  request_id: string
  endpoint: string
  method: string
  response_time_ms: number
  status_code: number
  cache_hit: boolean
  database_queries: number
  created_at: string
}

interface Summary {
  totalRequests: number
  avgResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  errorRate: number
  cacheHitRate: number
}

interface ApiResponse {
  data: {
    performance: PerformanceData[]
    apiMetrics: ApiMetrics[]
    currentMetrics: CurrentMetrics[]
    summary: Summary
  }
  timeRange: string
  startTime: string
  endTime: string
  error?: string
  hint?: string
}

interface _PerformanceDashboardProps {
  onEndpointClick?: (endpoint: string, timeRange: string) => void
}

export default function PerformanceDashboard() {
  const router = useRouter()
  const [data, setData] = useState<ApiResponse['data'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorHint, setErrorHint] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('1h')
  const [endpoint, setEndpoint] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isVisible, setIsVisible] = useState(true)

  // Helper function to convert time range to milliseconds
  const getTimeRangeMs = (range: string): number => {
    switch (range) {
      case '5m': return 5 * 60 * 1000
      case '15m': return 15 * 60 * 1000
      case '1h': return 60 * 60 * 1000
      case '6h': return 6 * 60 * 60 * 1000
      case '24h': return 24 * 60 * 60 * 1000
      case '7d': return 7 * 24 * 60 * 60 * 1000
      default: return 60 * 60 * 1000 // 1h default
    }
  }

  // Pause auto-refresh when tab is not visible
  useEffect(() => {
    const onVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible'
      setIsVisible(isVisible)
      if (!isVisible) {
        setAutoRefresh(false)
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    setErrorHint(null)

    try {
      const params = new URLSearchParams({
        timeRange,
        ...(endpoint && { endpoint })
      })

      const response = await fetch(`/api/admin/performance?${params}`)
      const result: ApiResponse = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          setError('Permission denied')
          setErrorHint(result.hint || 'Check admin role and RLS policies')
        } else {
          setError(result.error || 'Failed to fetch performance data')
          setErrorHint(result.hint || null)
        }
        return
      }

             setData(result.data)
       setLastUpdated(new Date())
     } catch (_err) {
       setError('Network error occurred')
       setErrorHint('Check network connection and try again')
     } finally {
       setLoading(false)
     }
  }

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, endpoint])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, timeRange, endpoint])

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString()
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const getPerformanceColor = (value: number, threshold: number) => {
    if (value <= threshold) return 'text-green-600'
    if (value <= threshold * 1.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusColor = (statusCode: number) => {
    if (statusCode < 300) return 'bg-green-100 text-green-800'
    if (statusCode < 400) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="font-semibold">{error}</div>
          {errorHint && (
            <div className="mt-2 text-sm opacity-90">
              <strong>Hint:</strong> {errorHint}
            </div>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time system performance metrics from 5-minute rollups
          </p>
        </div>
                 <div className="flex items-center gap-4">
           <div className="text-sm text-muted-foreground">
             {lastUpdated && (
               <span>Last updated: {lastUpdated.toLocaleTimeString()} UTC</span>
             )}
           </div>
           <Button
             variant={autoRefresh ? 'default' : 'outline'}
             size="sm"
             onClick={() => setAutoRefresh(!autoRefresh)}
             disabled={!isVisible}
           >
             <Activity className={`h-4 w-4 mr-2 ${autoRefresh && isVisible ? 'animate-pulse' : ''}`} />
             {autoRefresh && isVisible ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
           </Button>
           <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
             {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             Refresh Now
           </Button>
         </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="6h">Last 6 Hours</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Endpoint Filter</label>
              <Select value={endpoint} onValueChange={setEndpoint}>
                <SelectTrigger>
                  <SelectValue placeholder="All endpoints" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All endpoints</SelectItem>
                  <SelectItem value="/api/search/providers">Search API</SelectItem>
                  <SelectItem value="/api/bookings">Bookings API</SelectItem>
                  <SelectItem value="/api/analytics">Analytics API</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalRequests.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across {timeRange} time range
              </p>
            </CardContent>
          </Card>

                     <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
               <Clock className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className={`text-2xl font-bold ${getPerformanceColor(data.summary.avgResponseTime, 500)}`}>
                 {formatDuration(data.summary.avgResponseTime)}
               </div>
               <p className="text-xs text-muted-foreground" title="Target p95 < 500ms, p99 < 1s, error-rate < 1%">
                 Target: &lt;500ms
               </p>
             </CardContent>
           </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">P95 Response Time</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPerformanceColor(data.summary.p95ResponseTime, 1000)}`}>
                {formatDuration(data.summary.p95ResponseTime)}
              </div>
              <p className="text-xs text-muted-foreground">
                Target: &lt;1s
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">P99 Response Time</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPerformanceColor(data.summary.p99ResponseTime, 2000)}`}>
                {formatDuration(data.summary.p99ResponseTime)}
              </div>
              <p className="text-xs text-muted-foreground">
                Target: &lt;2s
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPerformanceColor(data.summary.errorRate * 100, 1)}`}>
                {(data.summary.errorRate * 100).toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Target: &lt;1%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPerformanceColor(data.summary.cacheHitRate * 100, 80)}`}>
                {(data.summary.cacheHitRate * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Target: &gt;80%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Timeline */}
      {data && data.performance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Timeline (5-min intervals)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.performance.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                                       <div className="flex items-center gap-3">
                     <Badge 
                       variant="outline" 
                       className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                       onClick={() => {
                         // Direct navigation to audit view
                         const fromISO = new Date(Date.now() - getTimeRangeMs(timeRange)).toISOString()
                         const toISO = new Date().toISOString()
                         router.push(`/admin/operational-insights?tab=audit&endpoint=${encodeURIComponent(item.endpoint)}&from=${fromISO}&to=${toISO}`)
                         
                         // Also send message for iframe scenarios
                         if (window.parent && window.parent !== window) {
                           window.parent.postMessage({
                             type: 'PERFORMANCE_DRILL_THROUGH',
                             endpoint: item.endpoint,
                             timeRange: timeRange
                           }, '*')
                         }
                       }}
                     >
                       {item.endpoint}
                     </Badge>
                     <span className="text-sm text-muted-foreground">
                       {formatTime(item.five_minute_bucket)}
                     </span>
                   </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{item.request_count} requests</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Avg:</span>
                      <span className={`ml-2 font-mono ${getPerformanceColor(item.avg_response_time_ms, 500)}`}>
                        {formatDuration(item.avg_response_time_ms)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">P95:</span>
                      <span className={`ml-2 font-mono ${getPerformanceColor(item.p95_response_time_ms, 1000)}`}>
                        {formatDuration(item.p95_response_time_ms)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">P99:</span>
                      <span className={`ml-2 font-mono ${getPerformanceColor(item.p99_response_time_ms, 2000)}`}>
                        {formatDuration(item.p99_response_time_ms)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cache:</span>
                      <span className="ml-2 font-mono">
                        {(item.cache_hit_rate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Requests */}
      {data && data.currentMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Requests (Live)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.currentMetrics.slice(0, 20).map((metric, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(metric.status_code)}>
                      {metric.status_code}
                    </Badge>
                    <div>
                      <div className="font-medium">
                        {metric.method} 
                        <span 
                          className="cursor-pointer hover:text-primary transition-colors ml-1"
                          onClick={() => {
                            const fromISO = new Date(Date.now() - getTimeRangeMs(timeRange)).toISOString()
                            const toISO = new Date().toISOString()
                            router.push(`/admin/operational-insights?tab=audit&endpoint=${encodeURIComponent(metric.endpoint)}&from=${fromISO}&to=${toISO}`)
                          }}
                        >
                          {metric.endpoint}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatTime(metric.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <div className="font-mono">{formatDuration(metric.response_time_ms)}</div>
                      <div className="text-muted-foreground">Response</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">{metric.database_queries}</div>
                      <div className="text-muted-foreground">DB Queries</div>
                    </div>
                    <div className="text-right">
                      <Badge variant={metric.cache_hit ? 'default' : 'secondary'}>
                        {metric.cache_hit ? 'Cache Hit' : 'Cache Miss'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading performance data...</span>
        </div>
      )}

      {!loading && !data && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="text-muted-foreground">
                No performance data available for the selected time range
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>How to use:</strong>
                <ol className="mt-2 space-y-1 text-left max-w-md mx-auto">
                  <li>1. Select time range (1h, 6h, 24h)</li>
                  <li>2. Filter by specific endpoint if needed</li>
                  <li>3. Click endpoint in chart to jump to audit view</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
