'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  RefreshCw
} from 'lucide-react'
import { sloMonitor, SLOViolation } from '@/lib/observability/sloMonitor'

interface SLOMetric {
  name: string
  current_p95: number
  target_p95: number
  current_p99: number
  target_p99: number
  current_error_rate: number
  target_error_rate: number
  status: 'healthy' | 'warning' | 'critical'
}

interface SLODashboardData {
  currentStatus: 'healthy' | 'warning' | 'critical'
  metrics: SLOMetric[]
  recentViolations: SLOViolation[]
}

export default function SLODashboard() {
  const [dashboardData, setDashboardData] = useState<SLODashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    loadDashboardData()
    // Start SLO monitoring
    sloMonitor.startMonitoring(5 * 60 * 1000) // Check every 5 minutes

    return () => {
      sloMonitor.stopMonitoring()
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await sloMonitor.getComplianceDashboard()
      setDashboardData(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SLO dashboard')
    } finally {
      setLoading(false)
    }
  }

  const resolveViolation = async (violationId: number) => {
    try {
      await sloMonitor.resolveViolation(violationId, 'admin')
      await loadDashboardData() // Refresh data
    } catch (err) {
      console.error('Failed to resolve violation:', err)
    }
  }

  const getStatusIcon = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
    }
  }

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatErrorRate = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`
  }

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading SLO dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!dashboardData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No SLO data available</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SLO Dashboard</h1>
          <p className="text-muted-foreground">
            Service Level Objectives monitoring and compliance
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdated?.toLocaleTimeString() || 'Never'}
          </div>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Overall System Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            {getStatusIcon(dashboardData.currentStatus)}
            <div>
              <div className="text-2xl font-bold capitalize">
                {dashboardData.currentStatus}
              </div>
              <div className="text-sm text-muted-foreground">
                {dashboardData.metrics.filter(m => m.status === 'healthy').length} of {dashboardData.metrics.length} metrics healthy
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardData.metrics.map((metric) => (
          <Card key={metric.name} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg capitalize">
                  {metric.name.replace('_', ' ')}
                </CardTitle>
                <Badge className={getStatusColor(metric.status)}>
                  {metric.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* P95 Latency */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">P95 Latency</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono">
                    {formatLatency(metric.current_p95)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {formatLatency(metric.target_p95)}
                  </span>
                  {metric.current_p95 > metric.target_p95 ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>

              {/* P99 Latency */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">P99 Latency</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono">
                    {formatLatency(metric.current_p99)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {formatLatency(metric.target_p99)}
                  </span>
                  {metric.current_p99 > metric.target_p99 ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>

              {/* Error Rate */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Error Rate</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono">
                    {formatErrorRate(metric.current_error_rate)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {formatErrorRate(metric.target_error_rate)}
                  </span>
                  {metric.current_error_rate > metric.target_error_rate ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Violations */}
      {dashboardData.recentViolations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Recent Violations</span>
            </CardTitle>
            <CardDescription>
              {dashboardData.recentViolations.length} unresolved violations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentViolations.map((violation) => (
                <div
                  key={violation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Badge className={getStatusColor(violation.severity)}>
                        {violation.severity}
                      </Badge>
                      <span className="font-medium">
                        {violation.metric_name.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {violation.violation_type}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        Current: {violation.current_value} | Target: {violation.threshold_value}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          First: {new Date(violation.first_violation_at).toLocaleString()}
                        </span>
                        <span>•</span>
                        <span>
                          Count: {violation.violation_count}
                        </span>
                      </div>
                      {violation.endpoint && (
                        <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {violation.endpoint}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => resolveViolation(violation.id)}
                    variant="outline"
                    size="sm"
                  >
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Violations Message */}
      {dashboardData.recentViolations.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                All SLOs are healthy
              </h3>
              <p className="text-gray-500">
                No violations detected in the last 24 hours
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
