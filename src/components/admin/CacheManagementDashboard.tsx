'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Loader2, Activity, Clock, AlertTriangle, 
  Zap, RefreshCw, Play, Pause, Settings, BarChart3,
  Target, Gauge, History
} from 'lucide-react'
import { 
  CachePerformanceMetrics, 
  CacheInvalidationPattern
} from '@/lib/cache/monitoring'
import { 
  CacheWarmingStrategy, 
  WarmingResult 
} from '@/lib/cache/warming'

interface CacheOverview {
  performance: CachePerformanceMetrics[]
  invalidationPatterns: CacheInvalidationPattern[]
  healthSummary: {
    overallHitRate: number
    totalCacheEntries: number
    avgResponseTime: number
    invalidationEfficiency: number
    recommendations: string[]
  }
  warmingMetrics: {
    totalStrategies: number
    enabledStrategies: number
    totalQueriesExecuted: number
    avgSuccessRate: number
    avgDuration: number
    lastWarmingRun?: string
  }
  timeRange: string
}

export default function CacheManagementDashboard() {
  const [overview, setOverview] = useState<CacheOverview | null>(null)
  const [strategies, setStrategies] = useState<CacheWarmingStrategy[]>([])
  const [warmingHistory, setWarmingHistory] = useState<WarmingResult[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('24h')
  const [activeTab, setActiveTab] = useState('overview')
  const [warmingServiceStatus, setWarmingServiceStatus] = useState<'running' | 'stopped'>('stopped')
  const [systemStatus, _setSystemStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy')
  const [showEmergencyControls, setShowEmergencyControls] = useState(false)

  const fetchCacheData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/cache?timeRange=${timeRange}`)
      const data = await response.json()

      if (data.success) {
        setOverview(data.data)
      } else {
        console.error('Failed to fetch cache data:', data.error)
      }
    } catch (error) {
      console.error('Error fetching cache data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWarmingStrategies = async () => {
    try {
      const response = await fetch('/api/admin/cache?action=warming-strategies')
      const data = await response.json()

      if (data.success) {
        setStrategies(data.data)
      }
    } catch (error) {
      console.error('Error fetching warming strategies:', error)
    }
  }

  const fetchWarmingHistory = async () => {
    try {
      const response = await fetch('/api/admin/cache?action=warming-history&limit=100')
      const data = await response.json()

      if (data.success) {
        setWarmingHistory(data.data)
      }
    } catch (error) {
      console.error('Error fetching warming history:', error)
    }
  }

  const executeWarmingStrategy = async (strategyId: string) => {
    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute-warming', strategyId })
      })

      const data = await response.json()
      if (data.success) {
        // Refresh data after execution
        await fetchCacheData()
        await fetchWarmingHistory()
      }
    } catch (error) {
      console.error('Error executing warming strategy:', error)
    }
  }

  const toggleWarmingStrategy = async (strategyId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-warming-strategy', strategyId, enabled })
      })

      const data = await response.json()
      if (data.success) {
        await fetchWarmingStrategies()
      }
    } catch (error) {
      console.error('Error updating warming strategy:', error)
    }
  }

  const toggleWarmingService = async () => {
    const action = warmingServiceStatus === 'running' ? 'stop-warming-service' : 'start-warming-service'
    
    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const data = await response.json()
      if (data.success) {
        setWarmingServiceStatus(warmingServiceStatus === 'running' ? 'stopped' : 'running')
      }
    } catch (error) {
      console.error('Error toggling warming service:', error)
    }
  }

  const emergencyInvalidateAll = async () => {
    if (!confirm('⚠️ DANGER: This will invalidate ALL cache entries immediately. Continue?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'emergency-invalidate-all' })
      });

      const data = await response.json();
      if (data.success) {
        alert(`✅ Emergency invalidation completed. ${data.invalidatedCount} entries invalidated.`);
        await fetchCacheData();
      } else {
        alert(`❌ Emergency invalidation failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Emergency invalidation error:', error);
      alert('❌ Emergency invalidation failed');
    }
  }

  const emergencyStopWarming = async () => {
    if (!confirm('⚠️ Stop all warming services immediately?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'emergency-stop-warming' })
      });

      const data = await response.json();
      if (data.success) {
        setWarmingServiceStatus('stopped');
        alert('✅ All warming services stopped immediately');
      } else {
        alert(`❌ Failed to stop warming services: ${data.error}`);
      }
    } catch (error) {
      console.error('Emergency stop error:', error);
      alert('❌ Failed to stop warming services');
    }
  }

  const resetCircuitBreaker = async () => {
    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'emergency-reset-circuit-breaker' })
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Circuit breaker reset - warming service restarted');
        await fetchCacheData();
      } else {
        alert(`❌ Failed to reset circuit breaker: ${data.error}`);
      }
    } catch (error) {
      console.error('Circuit breaker reset error:', error);
      alert('❌ Failed to reset circuit breaker');
    }
  }

  const getSystemStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  const getSystemStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '🟢';
      case 'warning': return '🟡';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  }

  useEffect(() => {
    fetchCacheData()
    fetchWarmingStrategies()
    fetchWarmingHistory()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading cache data...</span>
      </div>
    )
  }

  if (!overview) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load cache management data</AlertDescription>
      </Alert>
    )
  }

  const getCacheHitRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getResponseTimeColor = (time: number) => {
    if (time <= 200) return 'text-green-600'
    if (time <= 500) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header with Emergency Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cache Management</h1>
          <p className="text-muted-foreground">Monitor and optimize cache performance</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* System Status Indicator */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getSystemStatusColor(systemStatus)}`}>
            <span className="text-lg">{getSystemStatusIcon(systemStatus)}</span>
            <span className="font-medium">System: {systemStatus}</span>
          </div>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={fetchCacheData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          {/* Emergency Controls Toggle */}
          <Button
            onClick={() => setShowEmergencyControls(!showEmergencyControls)}
            variant="destructive"
            size="sm"
          >
            🚨 Emergency
          </Button>
        </div>
      </div>

      {/* Emergency Controls Panel */}
      {showEmergencyControls && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <div className="font-medium text-red-800 mb-3">🚨 Emergency Controls</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={emergencyInvalidateAll}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                💥 Invalidate All Cache
              </Button>
              <Button
                onClick={emergencyStopWarming}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                ⏹️ Stop All Warming
              </Button>
              <Button
                onClick={resetCircuitBreaker}
                variant="outline"
                size="sm"
                className="w-full"
              >
                🔄 Reset Circuit Breaker
              </Button>
            </div>
            <div className="text-xs text-red-600 mt-2">
              ⚠️ Use these controls only in emergency situations
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Cache Health Summary with System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              Cache Hit Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getCacheHitRateColor(overview.healthSummary.overallHitRate)}`}>
              {overview.healthSummary.overallHitRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {overview.healthSummary.totalCacheEntries} entries
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getResponseTimeColor(overview.healthSummary.avgResponseTime)}`}>
              {formatDuration(overview.healthSummary.avgResponseTime)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Target: &lt;500ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Warming Strategies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.warmingMetrics.enabledStrategies}/{overview.warmingMetrics.totalStrategies}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {overview.warmingMetrics.avgSuccessRate.toFixed(1)}% success rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Invalidation Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overview.healthSummary.invalidationEfficiency > 20 ? 'text-red-600' : 'text-green-600'}`}>
              {overview.healthSummary.invalidationEfficiency.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Lower is better
            </div>
          </CardContent>
        </Card>
        
        {/* New System Status Card */}
        <Card className={`border-2 ${systemStatus === 'critical' ? 'border-red-500' : systemStatus === 'warning' ? 'border-yellow-500' : 'border-green-500'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSystemStatusColor(systemStatus)}`}>
              {getSystemStatusIcon(systemStatus)} {systemStatus.toUpperCase()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {systemStatus === 'healthy' && 'All systems operational'}
              {systemStatus === 'warning' && 'Performance degradation detected'}
              {systemStatus === 'critical' && 'Immediate attention required'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {overview.healthSummary.recommendations.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Cache Optimization Recommendations:</div>
            <ul className="list-disc list-inside space-y-1">
              {overview.healthSummary.recommendations.map((rec, index) => (
                <li key={index} className="text-sm">{rec}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="warming">Warming</TabsTrigger>
          <TabsTrigger value="optimization">TTL Optimization</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Performance by Query Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Cache Performance by Query Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overview.performance.slice(0, 10).map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{metric.queryType}</Badge>
                      <div className="text-sm text-muted-foreground">
                        {metric.totalRequests} requests
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <div className={`font-mono ${getCacheHitRateColor(metric.cacheHitRate)}`}>
                          {metric.cacheHitRate.toFixed(1)}%
                        </div>
                        <div className="text-muted-foreground">Hit Rate</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono ${getResponseTimeColor(metric.avgResponseTime)}`}>
                          {formatDuration(metric.avgResponseTime)}
                        </div>
                        <div className="text-muted-foreground">Response</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono">{metric.avgTTL}m</div>
                        <div className="text-muted-foreground">TTL</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invalidation Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Top Invalidation Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overview.invalidationPatterns.slice(0, 5).map((pattern, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{pattern.tag}</Badge>
                      <div className="text-sm text-muted-foreground">
                        {pattern.frequency} times
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <div className="font-mono">{pattern.avgBatchSize}</div>
                        <div className="text-muted-foreground">Avg Batch</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono">{pattern.impactScore.toFixed(1)}</div>
                        <div className="text-muted-foreground">Impact</div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {formatTime(pattern.lastInvalidated)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Detailed Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Query Type</th>
                      <th className="text-left p-2">Hit Rate</th>
                      <th className="text-left p-2">Response Time</th>
                      <th className="text-left p-2">Requests</th>
                      <th className="text-left p-2">TTL (min)</th>
                      <th className="text-left p-2">Invalidations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.performance.map((metric, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{metric.queryType}</td>
                        <td className={`p-2 ${getCacheHitRateColor(metric.cacheHitRate)}`}>
                          {metric.cacheHitRate.toFixed(1)}%
                        </td>
                        <td className={`p-2 ${getResponseTimeColor(metric.avgResponseTime)}`}>
                          {formatDuration(metric.avgResponseTime)}
                        </td>
                        <td className="p-2">{metric.totalRequests}</td>
                        <td className="p-2">{metric.avgTTL}</td>
                        <td className="p-2">{metric.invalidationCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warming Tab */}
        <TabsContent value="warming" className="space-y-6">
          {/* Warming Service Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Warming Service Control
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${warmingServiceStatus === 'running' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm">
                    Service: {warmingServiceStatus === 'running' ? 'Running' : 'Stopped'}
                  </span>
                </div>
                
                <Button 
                  onClick={toggleWarmingService}
                  variant={warmingServiceStatus === 'running' ? 'destructive' : 'default'}
                  size="sm"
                >
                  {warmingServiceStatus === 'running' ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Warming Strategies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Warming Strategies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {strategies.map((strategy) => (
                  <div key={strategy.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{strategy.name}</h4>
                        <p className="text-sm text-muted-foreground">{strategy.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={strategy.enabled ? 'default' : 'secondary'}>
                          {strategy.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Badge variant="outline">Priority {strategy.priority}</Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <div className="text-muted-foreground">Schedule</div>
                        <div className="font-mono">
                          {strategy.schedule.type === 'interval' 
                            ? `Every ${strategy.schedule.value} min`
                            : strategy.schedule.type === 'cron'
                            ? 'Cron-based'
                            : 'Event-driven'
                          }
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Success Rate</div>
                        <div className="font-mono">{strategy.successRate.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg Duration</div>
                        <div className="font-mono">{formatDuration(strategy.avgDuration)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Queries</div>
                        <div className="font-mono">{strategy.queries.length}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => executeWarmingStrategy(strategy.id)}
                        size="sm"
                        variant="outline"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Execute Now
                      </Button>
                      
                      <Button
                        onClick={() => toggleWarmingStrategy(strategy.id, !strategy.enabled)}
                        size="sm"
                        variant={strategy.enabled ? 'destructive' : 'default'}
                      >
                        {strategy.enabled ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Warming History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Warming History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {warmingHistory.slice(0, 20).map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        {strategies.find(s => s.id === result.strategyId)?.name || result.strategyId}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {result.queriesExecuted} queries
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <div className="font-mono text-green-600">{result.queriesSucceeded}</div>
                        <div className="text-muted-foreground">Success</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-red-600">{result.queriesFailed}</div>
                        <div className="text-muted-foreground">Failed</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono">{formatDuration(result.totalDuration)}</div>
                        <div className="text-muted-foreground">Duration</div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {formatTime(result.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TTL Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                TTL Optimization Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* This would be populated by calling the TTL optimization endpoint */}
                <div className="text-center text-muted-foreground py-8">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>TTL optimization analysis will appear here</p>
                  <p className="text-sm">Click &quot;Analyze TTL&quot; to generate recommendations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
