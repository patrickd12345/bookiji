'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Bell, X } from 'lucide-react'

interface ResilienceMetric {
  metric_name: string
  metric_value: number
  threshold: number
  status: 'healthy' | 'alert' | 'no_data'
}

interface Alert {
  id: string
  timestamp: string
  metric: string
  currentValue: number
  threshold: number
  severity: 'info' | 'warning' | 'critical'
  message: string
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
}

interface ResilienceDashboardProps {
  className?: string
}

export function ResilienceDashboard({ className = '' }: ResilienceDashboardProps) {
  const [metrics, setMetrics] = useState<ResilienceMetric[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchMetrics = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/resilience-metrics')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics || [])
        setAlerts(data.alerts || [])
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch resilience metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/admin/resilience-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId,
          acknowledgedBy: 'admin' // In production, use actual user ID
        })
      })

      if (response.ok) {
        // Update local state
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true, acknowledgedBy: 'admin', acknowledgedAt: new Date().toISOString() }
            : alert
        ))
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  useEffect(() => {
    fetchMetrics()
    // Refresh every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const getMetricDisplay = (metric: ResilienceMetric) => {
    const { metric_name, metric_value, threshold, status } = metric
    
    const displayNames: Record<string, string> = {
      rollback_rate: 'Rollback Rate',
      retry_success_rate: 'Retry Success Rate',
      error_recovery_rate: 'Error Recovery Rate'
    }

    const formatValue = (value: number) => {
      if (metric_name.includes('rate')) {
        return `${value.toFixed(1)}%`
      }
      return value.toFixed(2)
    }

    const getStatusIcon = () => {
      switch (status) {
        case 'healthy':
          return <CheckCircle className="w-4 h-4 text-green-500" />
        case 'alert':
          return <AlertTriangle className="w-4 h-4 text-red-500" />
        case 'no_data':
          return <AlertTriangle className="w-4 h-4 text-yellow-500" />
        default:
          return null
      }
    }

    const getStatusColor = () => {
      switch (status) {
        case 'healthy':
          return 'bg-green-100 text-green-800'
        case 'alert':
          return 'bg-red-100 text-red-800'
        case 'no_data':
          return 'bg-yellow-100 text-yellow-800'
        default:
          return 'bg-gray-100 text-gray-800'
      }
    }

    const getTrendIcon = () => {
      if (status === 'no_data') return null
      
      if (metric_name.includes('rate') && metric_name !== 'rollback_rate') {
        // Higher is better for success/recovery rates
        return metric_value >= threshold ? 
          <TrendingUp className="w-4 h-4 text-green-500" /> : 
          <TrendingDown className="w-4 h-4 text-red-500" />
      } else {
        // Lower is better for rollback rate
        return metric_value <= threshold ? 
          <TrendingUp className="w-4 h-4 text-green-500" /> : 
          <TrendingDown className="w-4 h-4 text-red-500" />
      }
    }

    return (
      <Card key={metric_name} className="col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {displayNames[metric_name] || metric_name}
          </CardTitle>
          {getStatusIcon()}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatValue(metric_value)}</div>
          <div className="flex items-center justify-between mt-2">
            <Badge className={getStatusColor()}>
              {status === 'healthy' ? 'Healthy' : 
               status === 'alert' ? 'Alert' : 'No Data'}
            </Badge>
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span className="text-xs text-muted-foreground">
                Target: {formatValue(threshold)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getAlertDisplay = (alert: Alert) => {
    const getSeverityColor = () => {
      switch (alert.severity) {
        case 'critical': return 'bg-red-100 text-red-800 border-red-200'
        case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        case 'info': return 'bg-blue-100 text-blue-800 border-blue-200'
        default: return 'bg-gray-100 text-gray-800 border-gray-200'
      }
    }

    const getSeverityIcon = () => {
      switch (alert.severity) {
        case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />
        case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />
        case 'info': return <Bell className="w-4 h-4 text-blue-600" />
        default: return <Bell className="w-4 h-4 text-gray-600" />
      }
    }

    return (
      <div key={alert.id} className={`p-4 border rounded-lg ${getSeverityColor()}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getSeverityIcon()}
              <Badge variant="outline" className="capitalize">
                {alert.severity}
              </Badge>
              {alert.acknowledged && (
                <Badge variant="secondary" className="text-xs">
                  Acknowledged
                </Badge>
              )}
            </div>
            <h4 className="font-medium mb-1">
              {alert.metric.replace(/_/g, ' ').toUpperCase()}
            </h4>
            <p className="text-sm mb-2">{alert.message}</p>
            <div className="flex items-center gap-4 text-xs">
              <span>Current: {alert.currentValue.toFixed(1)}%</span>
              <span>Threshold: {alert.threshold.toFixed(1)}%</span>
              <span>Time: {new Date(alert.timestamp).toLocaleString()}</span>
            </div>
            {alert.acknowledged && (
              <div className="text-xs mt-2 text-gray-600">
                Acknowledged by {alert.acknowledgedBy} at {new Date(alert.acknowledgedAt!).toLocaleString()}
              </div>
            )}
          </div>
          {!alert.acknowledged && (
            <Button
              onClick={() => acknowledgeAlert(alert.id)}
              variant="outline"
              size="sm"
              className="ml-4"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Acknowledge
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Resilience Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of Bookiji's resilience patterns
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button 
            onClick={fetchMetrics} 
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Alerts Section */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Active Alerts ({alerts.filter(a => !a.acknowledged).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map(getAlertDisplay)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map(getMetricDisplay)}
      </div>

      {/* Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle>System Health Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No metrics available
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span>Overall Health</span>
                  <Badge className={
                    metrics.every(m => m.status === 'healthy') ? 'bg-green-100 text-green-800' :
                    metrics.some(m => m.status === 'alert') ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }>
                    {metrics.every(m => m.status === 'healthy') ? 'All Systems Healthy' :
                     metrics.some(m => m.status === 'alert') ? 'System Issues Detected' :
                     'Limited Data Available'}
                  </Badge>
                </div>
                
                <div className="grid gap-2 text-sm">
                  {metrics.map(metric => (
                    <div key={metric.metric_name} className="flex items-center justify-between">
                      <span className="capitalize">
                        {metric.metric_name.replace(/_/g, ' ')}
                      </span>
                      <span className={
                        metric.status === 'healthy' ? 'text-green-600' :
                        metric.status === 'alert' ? 'text-red-600' :
                        'text-yellow-600'
                      }>
                        {metric.status === 'healthy' ? '✓' : 
                         metric.status === 'alert' ? '✗' : '?'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.some(m => m.status === 'alert') ? (
              <>
                <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800">Immediate Attention Required</h4>
                    <p className="text-sm text-red-700">
                      Some resilience metrics are outside healthy thresholds. 
                      Review system logs and consider scaling or optimization.
                    </p>
                  </div>
                </div>
              </>
            ) : metrics.every(m => m.status === 'healthy') ? (
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">All Systems Operating Normally</h4>
                  <p className="text-sm text-green-700">
                    Resilience patterns are performing within expected parameters. 
                    Continue monitoring for any changes.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Limited Data Available</h4>
                  <p className="text-sm text-yellow-700">
                    Some metrics have insufficient data for health assessment. 
                    Wait for more data or investigate data collection.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

