'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AlertTriangle, Activity, TrendingUp, TrendingDown, DollarSign, Clock, HardDrive, Cpu } from 'lucide-react'
import { performanceGuardrails, PerformanceMetrics } from '@/lib/performance/guardrails'

interface PerformanceSummary {
  current: PerformanceMetrics | null
  average: Partial<PerformanceMetrics>
  violations: string[]
  recommendations: string[]
}

export function PerformanceMonitor() {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5000) // 5 seconds
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [alertConfig, setAlertConfig] = useState<any>(null)
  const [testingAlerts, setTestingAlerts] = useState(false)

  useEffect(() => {
    if (!isMonitoring) return

    const updateSummary = () => {
      const perfSummary = performanceGuardrails.getPerformanceSummary()
      setSummary(perfSummary)
    }

    // Initial update
    updateSummary()

    // Set up interval
    const interval = setInterval(updateSummary, refreshInterval)

    return () => clearInterval(interval)
  }, [isMonitoring, refreshInterval])

  // Load alert configuration
  useEffect(() => {
    const loadAlertConfig = async () => {
      try {
        const response = await fetch('/api/admin/test-alerts')
        if (response.ok) {
          const data = await response.json()
          setAlertConfig(data.config)
        }
      } catch (error) {
        console.error('Failed to load alert config:', error)
      }
    }
    loadAlertConfig()
  }, [])

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring)
    performanceGuardrails.setEnabled(!isMonitoring)
  }

  const clearMetrics = () => {
    performanceGuardrails.clear()
    setSummary(null)
  }

  const testAlerts = async () => {
    setTestingAlerts(true)
    try {
      const response = await fetch('/api/admin/test-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          severity: 'warning',
          testMessage: 'Test alert triggered from Performance Monitor'
        })
      })
      
      if (response.ok) {
        alert('Test alerts sent successfully! Check your configured channels.')
      } else {
        alert('Failed to send test alerts. Check console for details.')
      }
    } catch (error) {
      console.error('Failed to test alerts:', error)
      alert('Failed to send test alerts. Check console for details.')
    } finally {
      setTestingAlerts(false)
    }
  }

  const _getStatusColor = (value: number, threshold: number) => {
    if (value >= threshold) return 'text-red-600'
    if (value >= threshold * 0.8) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getStatusIcon = (value: number, threshold: number) => {
    if (value >= threshold) return <AlertTriangle className="w-4 h-4 text-red-600" />
    if (value >= threshold * 0.8) return <TrendingUp className="w-4 h-4 text-yellow-600" />
    return <TrendingDown className="w-4 h-4 text-green-600" />
  }

  if (!summary) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Performance Monitor</h1>
          <div className="space-x-2">
            <Button onClick={toggleMonitoring} variant="outline">
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>No performance data available</p>
              <p className="text-sm mt-2">Start monitoring to see real-time performance metrics</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Performance Monitor</h1>
        <div className="space-x-2">
          <Button onClick={toggleMonitoring} variant={isMonitoring ? 'destructive' : 'default'}>
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
          <Button onClick={clearMetrics} variant="outline">
            Clear Metrics
          </Button>
          <Button 
            onClick={testAlerts} 
            variant="outline" 
            disabled={testingAlerts}
          >
            {testingAlerts ? 'Testing...' : 'Test Alerts'}
          </Button>
        </div>
      </div>

      {/* Current Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {summary.current?.responseTime ? `${summary.current.responseTime}ms` : 'N/A'}
              {summary.current?.responseTime && getStatusIcon(summary.current.responseTime, 5000)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Avg: {summary.average.responseTime ? `${summary.average.responseTime.toFixed(0)}ms` : 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {summary.current?.memoryUsage ? `${summary.current.memoryUsage.toFixed(1)}MB` : 'N/A'}
              {summary.current?.memoryUsage && getStatusIcon(summary.current.memoryUsage, 512)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Avg: {summary.average.memoryUsage ? `${summary.average.memoryUsage.toFixed(1)}MB` : 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              CPU Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {summary.current?.cpuUsage ? `${summary.current.cpuUsage.toFixed(1)}%` : 'N/A'}
              {summary.current?.cpuUsage && getStatusIcon(summary.current.cpuUsage, 80)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Avg: {summary.average.cpuUsage ? `${summary.average.cpuUsage.toFixed(1)}%` : 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Request Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.average.requestCount ? `${(summary.average.requestCount * 60).toFixed(0)}/min` : 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Total: {summary.average.requestCount || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Violations */}
      {summary.violations.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Performance Alerts ({summary.violations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.violations.slice(-5).map((violation, index) => (
                <div key={index} className="flex items-start gap-2 p-3 border border-red-300 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  <p className="text-red-800 text-sm">
                    {violation}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {summary.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-blue-800">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monitor Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Refresh Interval</label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value={1000}>1 second</option>
                  <option value={5000}>5 seconds</option>
                  <option value={10000}>10 seconds</option>
                  <option value={30000}>30 seconds</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <div className="mt-1 flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm">
                    {isMonitoring ? 'Active Monitoring' : 'Monitoring Stopped'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Alert Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            {alertConfig ? (
              <div className="space-y-3">
                <div className="text-sm">
                  <strong>Environment:</strong> {alertConfig.environment}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${alertConfig.slackEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm">Slack Alerts {alertConfig.slackEnabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${alertConfig.emailEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm">Email Alerts {alertConfig.emailEnabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${alertConfig.pagerDutyEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm">PagerDuty {alertConfig.pagerDutyEnabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
                <div className="pt-2">
                  <Button onClick={testAlerts} size="sm" variant="outline" disabled={testingAlerts}>
                    {testingAlerts ? 'Testing...' : 'Test All Channels'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Loading alert configuration...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
