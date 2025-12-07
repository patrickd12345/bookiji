/**
 * MetricsAI - Autonomous metrics analyst for Bookiji's Ops Fabric
 * 
 * Responsibilities:
 * - Monitor and analyze system-level metrics
 * - Interpret trends in CPU/memory, booking throughput, error rates, and P95 latency
 * - Generate structured summaries
 * - Detect anomalies early and escalate concerns
 * - Never perform actions—analysis only
 */

export interface SystemMetrics {
  timestamp: string
  cpu_percent?: number
  memory_percent?: number
  active_connections?: number
  database_size_mb?: number
  cache_hit_rate?: number
}

export interface BookingMetrics {
  timestamp: string
  bookings_created: number
  bookings_confirmed: number
  bookings_cancelled: number
  bookings_completed: number
  total_revenue_cents: number
  avg_booking_value_cents: number
}

export interface P95Metrics {
  timestamp: string
  endpoint: string
  method: string
  p95_latency_ms: number
  p99_latency_ms: number
  avg_latency_ms: number
  request_count: number
}

export interface ErrorMetrics {
  timestamp: string
  total_errors: number
  error_rate_percent: number
  status_4xx: number
  status_5xx: number
  top_error_endpoints: Array<{
    endpoint: string
    method: string
    error_count: number
    error_rate_percent: number
  }>
}

export interface MetricsSummary {
  summary: string
  trends: {
    direction: 'improving' | 'degrading' | 'stable'
    description: string
    evidence: string[]
  }
  anomalies: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical'
    type: string
    description: string
    evidence: string[]
    recommended_checks: string[]
  }>
  recommended_checks: string[]
  timestamp: string
  time_range: string
}

export class MetricsAI {
  /**
   * Analyze system metrics (CPU/memory)
   */
  static analyzeSystemMetrics(
    current: SystemMetrics[],
    previous?: SystemMetrics[]
  ): MetricsSummary {
    if (current.length === 0) {
      return {
        summary: 'No system metrics available for analysis.',
        trends: {
          direction: 'stable',
          description: 'Insufficient data to determine trends.',
          evidence: []
        },
        anomalies: [],
        recommended_checks: [
          'Verify system metrics collection is active',
          'Check if performance_metrics table has recent entries',
          'Review database connection health'
        ],
        timestamp: new Date().toISOString(),
        time_range: 'N/A'
      }
    }

    const latest = current[current.length - 1]
    const avgCpu = this.calculateAverage(current, 'cpu_percent')
    const avgMemory = this.calculateAverage(current, 'memory_percent')
    const avgCacheHit = this.calculateAverage(current, 'cache_hit_rate')

    const trends = this.detectSystemTrends(current, previous)
    const anomalies = this.detectSystemAnomalies(current, latest)

    const summary = this.generateSystemSummary(
      latest,
      avgCpu,
      avgMemory,
      avgCacheHit,
      current.length
    )

    return {
      summary,
      trends,
      anomalies,
      recommended_checks: this.generateSystemChecks(anomalies, latest),
      timestamp: new Date().toISOString(),
      time_range: this.getTimeRange(current)
    }
  }

  /**
   * Analyze booking throughput metrics
   */
  static analyzeBookingMetrics(
    current: BookingMetrics[],
    previous?: BookingMetrics[]
  ): MetricsSummary {
    if (current.length === 0) {
      return {
        summary: 'No booking metrics available for analysis.',
        trends: {
          direction: 'stable',
          description: 'Insufficient data to determine trends.',
          evidence: []
        },
        anomalies: [],
        recommended_checks: [
          'Verify bookings table has recent entries',
          'Check booking creation API endpoints',
          'Review booking confirmation flow'
        ],
        timestamp: new Date().toISOString(),
        time_range: 'N/A'
      }
    }

    const totalCreated = current.reduce((sum, m) => sum + m.bookings_created, 0)
    const totalConfirmed = current.reduce((sum, m) => sum + m.bookings_confirmed, 0)
    const totalCancelled = current.reduce((sum, m) => sum + m.bookings_cancelled, 0)
    const totalRevenue = current.reduce((sum, m) => sum + m.total_revenue_cents, 0)
    const avgValue = totalCreated > 0 ? totalRevenue / totalCreated : 0

    const conversionRate = totalCreated > 0 ? (totalConfirmed / totalCreated) * 100 : 0
    const cancellationRate = totalCreated > 0 ? (totalCancelled / totalCreated) * 100 : 0

    const trends = this.detectBookingTrends(current, previous)
    const anomalies = this.detectBookingAnomalies(current, {
      totalCreated,
      totalConfirmed,
      conversionRate,
      cancellationRate
    })

    const summary = this.generateBookingSummary(
      totalCreated,
      totalConfirmed,
      conversionRate,
      cancellationRate,
      totalRevenue,
      avgValue
    )

    return {
      summary,
      trends,
      anomalies,
      recommended_checks: this.generateBookingChecks(anomalies, conversionRate, cancellationRate),
      timestamp: new Date().toISOString(),
      time_range: this.getTimeRange(current)
    }
  }

  /**
   * Analyze P95 latency metrics
   */
  static analyzeP95Metrics(
    current: P95Metrics[],
    previous?: P95Metrics[]
  ): MetricsSummary {
    if (current.length === 0) {
      return {
        summary: 'No P95 latency metrics available for analysis.',
        trends: {
          direction: 'stable',
          description: 'Insufficient data to determine trends.',
          evidence: []
        },
        anomalies: [],
        recommended_checks: [
          'Verify performance_metrics table has recent entries',
          'Check if API endpoints are being monitored',
          'Review performance_analytics_5min materialized view'
        ],
        timestamp: new Date().toISOString(),
        time_range: 'N/A'
      }
    }

    const avgP95 = this.calculateAverage(current, 'p95_latency_ms')
    const maxP95 = Math.max(...current.map(m => m.p95_latency_ms))
    const avgP99 = this.calculateAverage(current, 'p99_latency_ms')
    const totalRequests = current.reduce((sum, m) => sum + m.request_count, 0)

    // Group by endpoint to identify slow endpoints
    const endpointGroups = this.groupByEndpoint(current)
    const slowEndpoints = this.identifySlowEndpoints(endpointGroups)

    const trends = this.detectLatencyTrends(current, previous)
    const anomalies = this.detectLatencyAnomalies(current, avgP95, maxP95, slowEndpoints)

    const summary = this.generateP95Summary(
      avgP95,
      avgP99,
      maxP95,
      totalRequests,
      slowEndpoints
    )

    return {
      summary,
      trends,
      anomalies,
      recommended_checks: this.generateLatencyChecks(anomalies, slowEndpoints, avgP95),
      timestamp: new Date().toISOString(),
      time_range: this.getTimeRange(current)
    }
  }

  /**
   * Analyze error rate metrics
   */
  static analyzeErrorMetrics(
    current: ErrorMetrics[],
    previous?: ErrorMetrics[]
  ): MetricsSummary {
    if (current.length === 0) {
      return {
        summary: 'No error metrics available for analysis.',
        trends: {
          direction: 'stable',
          description: 'Insufficient data to determine trends.',
          evidence: []
        },
        anomalies: [],
        recommended_checks: [
          'Verify performance_metrics table has error entries',
          'Check API error logs',
          'Review error monitoring setup'
        ],
        timestamp: new Date().toISOString(),
        time_range: 'N/A'
      }
    }

    const totalErrors = current.reduce((sum, m) => sum + m.total_errors, 0)
    const avgErrorRate = this.calculateAverage(current, 'error_rate_percent')
    const total4xx = current.reduce((sum, m) => sum + m.status_4xx, 0)
    const total5xx = current.reduce((sum, m) => sum + m.status_5xx, 0)

    // Aggregate top error endpoints
    const topErrors = this.aggregateTopErrorEndpoints(current)

    const trends = this.detectErrorTrends(current, previous)
    const anomalies = this.detectErrorAnomalies(current, avgErrorRate, total5xx, topErrors)

    const summary = this.generateErrorSummary(
      totalErrors,
      avgErrorRate,
      total4xx,
      total5xx,
      topErrors
    )

    return {
      summary,
      trends,
      anomalies,
      recommended_checks: this.generateErrorChecks(anomalies, avgErrorRate, total5xx, topErrors),
      timestamp: new Date().toISOString(),
      time_range: this.getTimeRange(current)
    }
  }

  // Private helper methods

  private static calculateAverage(metrics: any[], field: string): number {
    const values = metrics.map(m => m[field]).filter(v => v != null && !isNaN(v))
    if (values.length === 0) return 0
    return values.reduce((sum, v) => sum + v, 0) / values.length
  }

  private static getTimeRange(metrics: any[]): string {
    if (metrics.length === 0) return 'N/A'
    const first = metrics[0].timestamp || metrics[0].created_at || metrics[0].bucket
    const last = metrics[metrics.length - 1].timestamp || metrics[metrics.length - 1].created_at || metrics[metrics.length - 1].bucket
    return `${first} to ${last}`
  }

  private static detectSystemTrends(
    current: SystemMetrics[],
    previous?: SystemMetrics[]
  ): MetricsSummary['trends'] {
    if (!previous || previous.length === 0) {
      return {
        direction: 'stable',
        description: 'No historical data for trend comparison.',
        evidence: []
      }
    }

    const currentAvgCpu = this.calculateAverage(current, 'cpu_percent')
    const previousAvgCpu = this.calculateAverage(previous, 'cpu_percent')
    const currentAvgMemory = this.calculateAverage(current, 'memory_percent')
    const previousAvgMemory = this.calculateAverage(previous, 'memory_percent')

    const cpuChange = currentAvgCpu - previousAvgCpu
    const memoryChange = currentAvgMemory - previousAvgMemory

    const evidence: string[] = []
    if (Math.abs(cpuChange) > 5) {
      evidence.push(`CPU usage ${cpuChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(cpuChange).toFixed(1)}%`)
    }
    if (Math.abs(memoryChange) > 5) {
      evidence.push(`Memory usage ${memoryChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(memoryChange).toFixed(1)}%`)
    }

    if (cpuChange > 10 || memoryChange > 10) {
      return {
        direction: 'degrading',
        description: 'System resource usage is increasing.',
        evidence
      }
    } else if (cpuChange < -10 || memoryChange < -10) {
      return {
        direction: 'improving',
        description: 'System resource usage is decreasing.',
        evidence
      }
    }

    return {
      direction: 'stable',
      description: 'System resource usage is relatively stable.',
      evidence: evidence.length > 0 ? evidence : ['No significant changes detected']
    }
  }

  private static detectSystemAnomalies(
    metrics: SystemMetrics[],
    latest: SystemMetrics
  ): MetricsSummary['anomalies'] {
    const anomalies: MetricsSummary['anomalies'] = []

    if (latest.cpu_percent != null && latest.cpu_percent > 90) {
      anomalies.push({
        severity: 'critical',
        type: 'High CPU Usage',
        description: `CPU usage is at ${latest.cpu_percent.toFixed(1)}%, exceeding 90% threshold.`,
        evidence: [`Current CPU: ${latest.cpu_percent.toFixed(1)}%`],
        recommended_checks: [
          'Check for runaway processes',
          'Review database query performance',
          'Investigate API endpoint load'
        ]
      })
    } else if (latest.cpu_percent != null && latest.cpu_percent > 80) {
      anomalies.push({
        severity: 'high',
        type: 'Elevated CPU Usage',
        description: `CPU usage is at ${latest.cpu_percent.toFixed(1)}%, above 80% threshold.`,
        evidence: [`Current CPU: ${latest.cpu_percent.toFixed(1)}%`],
        recommended_checks: [
          'Monitor CPU trends',
          'Review recent deployments',
          'Check for resource-intensive operations'
        ]
      })
    }

    if (latest.memory_percent != null && latest.memory_percent > 90) {
      anomalies.push({
        severity: 'critical',
        type: 'High Memory Usage',
        description: `Memory usage is at ${latest.memory_percent.toFixed(1)}%, exceeding 90% threshold.`,
        evidence: [`Current Memory: ${latest.memory_percent.toFixed(1)}%`],
        recommended_checks: [
          'Check for memory leaks',
          'Review cache sizes',
          'Investigate connection pool usage'
        ]
      })
    }

    if (latest.cache_hit_rate != null && latest.cache_hit_rate < 50) {
      anomalies.push({
        severity: 'medium',
        type: 'Low Cache Hit Rate',
        description: `Cache hit rate is ${latest.cache_hit_rate.toFixed(1)}%, below optimal threshold.`,
        evidence: [`Current cache hit rate: ${latest.cache_hit_rate.toFixed(1)}%`],
        recommended_checks: [
          'Review cache invalidation patterns',
          'Check cache TTL settings',
          'Investigate cache warming strategies'
        ]
      })
    }

    return anomalies
  }

  private static generateSystemSummary(
    latest: SystemMetrics,
    avgCpu: number,
    avgMemory: number,
    avgCacheHit: number,
    dataPoints: number
  ): string {
    const parts: string[] = []
    parts.push(`Analyzed ${dataPoints} system metric data points.`)
    
    if (latest.cpu_percent != null) {
      parts.push(`Current CPU: ${latest.cpu_percent.toFixed(1)}% (avg: ${avgCpu.toFixed(1)}%)`)
    }
    if (latest.memory_percent != null) {
      parts.push(`Current Memory: ${latest.memory_percent.toFixed(1)}% (avg: ${avgMemory.toFixed(1)}%)`)
    }
    if (latest.cache_hit_rate != null) {
      parts.push(`Cache Hit Rate: ${avgCacheHit.toFixed(1)}%`)
    }

    return parts.join(' ')
  }

  private static generateSystemChecks(
    anomalies: MetricsSummary['anomalies'],
    latest: SystemMetrics
  ): string[] {
    const checks: string[] = []
    
    if (anomalies.length === 0) {
      checks.push('System metrics appear healthy')
      checks.push('Continue monitoring for trends')
    } else {
      checks.push(...anomalies.flatMap(a => a.recommended_checks))
    }

    return checks
  }

  private static detectBookingTrends(
    current: BookingMetrics[],
    previous?: BookingMetrics[]
  ): MetricsSummary['trends'] {
    if (!previous || previous.length === 0) {
      return {
        direction: 'stable',
        description: 'No historical data for trend comparison.',
        evidence: []
      }
    }

    const currentCreated = current.reduce((sum, m) => sum + m.bookings_created, 0)
    const previousCreated = previous.reduce((sum, m) => sum + m.bookings_created, 0)
    const changePercent = previousCreated > 0 
      ? ((currentCreated - previousCreated) / previousCreated) * 100 
      : 0

    const evidence: string[] = []
    if (Math.abs(changePercent) > 10) {
      evidence.push(`Booking creation ${changePercent > 0 ? 'increased' : 'decreased'} by ${Math.abs(changePercent).toFixed(1)}%`)
    }

    if (changePercent > 20) {
      return {
        direction: 'improving',
        description: 'Booking throughput is significantly increasing.',
        evidence
      }
    } else if (changePercent < -20) {
      return {
        direction: 'degrading',
        description: 'Booking throughput is significantly decreasing.',
        evidence
      }
    }

    return {
      direction: 'stable',
      description: 'Booking throughput is relatively stable.',
      evidence: evidence.length > 0 ? evidence : ['No significant changes detected']
    }
  }

  private static detectBookingAnomalies(
    metrics: BookingMetrics[],
    stats: {
      totalCreated: number
      totalConfirmed: number
      conversionRate: number
      cancellationRate: number
    }
  ): MetricsSummary['anomalies'] {
    const anomalies: MetricsSummary['anomalies'] = []

    if (stats.conversionRate < 50 && stats.totalCreated > 10) {
      anomalies.push({
        severity: 'high',
        type: 'Low Conversion Rate',
        description: `Conversion rate is ${stats.conversionRate.toFixed(1)}%, below expected threshold.`,
        evidence: [
          `Created: ${stats.totalCreated}, Confirmed: ${stats.totalConfirmed}`,
          `Conversion rate: ${stats.conversionRate.toFixed(1)}%`
        ],
        recommended_checks: [
          'Review booking confirmation flow',
          'Check payment processing issues',
          'Investigate user abandonment points'
        ]
      })
    }

    if (stats.cancellationRate > 30) {
      anomalies.push({
        severity: 'medium',
        type: 'High Cancellation Rate',
        description: `Cancellation rate is ${stats.cancellationRate.toFixed(1)}%, above normal threshold.`,
        evidence: [
          `Cancellation rate: ${stats.cancellationRate.toFixed(1)}%`
        ],
        recommended_checks: [
          'Review cancellation reasons',
          'Check provider availability issues',
          'Investigate booking conflicts'
        ]
      })
    }

    return anomalies
  }

  private static generateBookingSummary(
    totalCreated: number,
    totalConfirmed: number,
    conversionRate: number,
    cancellationRate: number,
    totalRevenue: number,
    avgValue: number
  ): string {
    return `Booking throughput analysis: ${totalCreated} bookings created, ${totalConfirmed} confirmed (${conversionRate.toFixed(1)}% conversion). ` +
           `${cancellationRate.toFixed(1)}% cancellation rate. ` +
           `Total revenue: $${(totalRevenue / 100).toFixed(2)}, avg booking value: $${(avgValue / 100).toFixed(2)}.`
  }

  private static generateBookingChecks(
    anomalies: MetricsSummary['anomalies'],
    conversionRate: number,
    cancellationRate: number
  ): string[] {
    const checks: string[] = []
    
    if (anomalies.length === 0) {
      checks.push('Booking metrics appear healthy')
      checks.push('Continue monitoring conversion and cancellation rates')
    } else {
      checks.push(...anomalies.flatMap(a => a.recommended_checks))
    }

    return checks
  }

  private static groupByEndpoint(metrics: P95Metrics[]): Map<string, P95Metrics[]> {
    const groups = new Map<string, P95Metrics[]>()
    for (const metric of metrics) {
      const key = `${metric.method} ${metric.endpoint}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(metric)
    }
    return groups
  }

  private static identifySlowEndpoints(
    groups: Map<string, P95Metrics[]>
  ): Array<{ endpoint: string; method: string; avgP95: number; requestCount: number }> {
    const slow: Array<{ endpoint: string; method: string; avgP95: number; requestCount: number }> = []
    
    for (const [key, metrics] of groups.entries()) {
      const [method, ...endpointParts] = key.split(' ')
      const endpoint = endpointParts.join(' ')
      const avgP95 = this.calculateAverage(metrics, 'p95_latency_ms')
      const requestCount = metrics.reduce((sum, m) => sum + m.request_count, 0)
      
      if (avgP95 > 500) { // SLO threshold
        slow.push({ endpoint, method, avgP95, requestCount })
      }
    }

    return slow.sort((a, b) => b.avgP95 - a.avgP95)
  }

  private static detectLatencyTrends(
    current: P95Metrics[],
    previous?: P95Metrics[]
  ): MetricsSummary['trends'] {
    if (!previous || previous.length === 0) {
      return {
        direction: 'stable',
        description: 'No historical data for trend comparison.',
        evidence: []
      }
    }

    const currentAvgP95 = this.calculateAverage(current, 'p95_latency_ms')
    const previousAvgP95 = this.calculateAverage(previous, 'p95_latency_ms')
    const changePercent = previousAvgP95 > 0 
      ? ((currentAvgP95 - previousAvgP95) / previousAvgP95) * 100 
      : 0

    const evidence: string[] = []
    if (Math.abs(changePercent) > 10) {
      evidence.push(`P95 latency ${changePercent > 0 ? 'increased' : 'decreased'} by ${Math.abs(changePercent).toFixed(1)}%`)
      evidence.push(`Current: ${currentAvgP95.toFixed(0)}ms, Previous: ${previousAvgP95.toFixed(0)}ms`)
    }

    if (changePercent > 20) {
      return {
        direction: 'degrading',
        description: 'P95 latency is significantly increasing.',
        evidence
      }
    } else if (changePercent < -20) {
      return {
        direction: 'improving',
        description: 'P95 latency is significantly improving.',
        evidence
      }
    }

    return {
      direction: 'stable',
      description: 'P95 latency is relatively stable.',
      evidence: evidence.length > 0 ? evidence : ['No significant changes detected']
    }
  }

  private static detectLatencyAnomalies(
    metrics: P95Metrics[],
    avgP95: number,
    maxP95: number,
    slowEndpoints: Array<{ endpoint: string; method: string; avgP95: number; requestCount: number }>
  ): MetricsSummary['anomalies'] {
    const anomalies: MetricsSummary['anomalies'] = []

    if (maxP95 > 1000) {
      anomalies.push({
        severity: 'critical',
        type: 'High P95 Latency',
        description: `Maximum P95 latency is ${maxP95.toFixed(0)}ms, exceeding 1s threshold.`,
        evidence: [
          `Max P95: ${maxP95.toFixed(0)}ms`,
          `Average P95: ${avgP95.toFixed(0)}ms`
        ],
        recommended_checks: [
          'Identify slow endpoints',
          'Review database query performance',
          'Check for N+1 query patterns',
          'Investigate cache effectiveness'
        ]
      })
    } else if (avgP95 > 500) {
      anomalies.push({
        severity: 'high',
        type: 'Elevated P95 Latency',
        description: `Average P95 latency is ${avgP95.toFixed(0)}ms, above 500ms SLO threshold.`,
        evidence: [
          `Average P95: ${avgP95.toFixed(0)}ms`
        ],
        recommended_checks: [
          'Review slow endpoints',
          'Check database connection pool',
          'Investigate external API dependencies'
        ]
      })
    }

    if (slowEndpoints.length > 0) {
      const topSlow = slowEndpoints.slice(0, 3)
      anomalies.push({
        severity: 'medium',
        type: 'Slow Endpoints Detected',
        description: `${slowEndpoints.length} endpoint(s) exceed 500ms P95 threshold.`,
        evidence: topSlow.map(e => `${e.method} ${e.endpoint}: ${e.avgP95.toFixed(0)}ms (${e.requestCount} requests)`),
        recommended_checks: [
          'Profile slow endpoint handlers',
          'Review database queries for these endpoints',
          'Check for missing indexes',
          'Consider adding caching'
        ]
      })
    }

    return anomalies
  }

  private static generateP95Summary(
    avgP95: number,
    avgP99: number,
    maxP95: number,
    totalRequests: number,
    slowEndpoints: Array<{ endpoint: string; method: string; avgP95: number; requestCount: number }>
  ): string {
    const parts: string[] = []
    parts.push(`P95 latency analysis: Average P95: ${avgP95.toFixed(0)}ms, Average P99: ${avgP99.toFixed(0)}ms, Max P95: ${maxP95.toFixed(0)}ms.`)
    parts.push(`Total requests analyzed: ${totalRequests.toLocaleString()}.`)
    if (slowEndpoints.length > 0) {
      parts.push(`${slowEndpoints.length} endpoint(s) exceed 500ms threshold.`)
    }
    return parts.join(' ')
  }

  private static generateLatencyChecks(
    anomalies: MetricsSummary['anomalies'],
    slowEndpoints: Array<{ endpoint: string; method: string; avgP95: number; requestCount: number }>,
    avgP95: number
  ): string[] {
    const checks: string[] = []
    
    if (anomalies.length === 0) {
      checks.push('P95 latency metrics appear healthy')
      checks.push('Continue monitoring for trends')
    } else {
      checks.push(...anomalies.flatMap(a => a.recommended_checks))
    }

    if (slowEndpoints.length > 0) {
      checks.push(`Review ${slowEndpoints.length} slow endpoint(s)`)
    }

    return checks
  }

  private static aggregateTopErrorEndpoints(
    metrics: ErrorMetrics[]
  ): Array<{ endpoint: string; method: string; error_count: number; error_rate_percent: number }> {
    const endpointMap = new Map<string, { count: number; total: number }>()
    
    for (const metric of metrics) {
      for (const endpoint of metric.top_error_endpoints) {
        const key = `${endpoint.method} ${endpoint.endpoint}`
        if (!endpointMap.has(key)) {
          endpointMap.set(key, { count: 0, total: 0 })
        }
        const entry = endpointMap.get(key)!
        entry.count += endpoint.error_count
        entry.total += endpoint.error_count / (endpoint.error_rate_percent / 100) // Estimate total requests
      }
    }

    const aggregated: Array<{ endpoint: string; method: string; error_count: number; error_rate_percent: number }> = []
    for (const [key, stats] of endpointMap.entries()) {
      const [method, ...endpointParts] = key.split(' ')
      const endpoint = endpointParts.join(' ')
      const errorRate = stats.total > 0 ? (stats.count / stats.total) * 100 : 0
      aggregated.push({
        endpoint,
        method,
        error_count: stats.count,
        error_rate_percent: errorRate
      })
    }

    return aggregated.sort((a, b) => b.error_count - a.error_count).slice(0, 10)
  }

  private static detectErrorTrends(
    current: ErrorMetrics[],
    previous?: ErrorMetrics[]
  ): MetricsSummary['trends'] {
    if (!previous || previous.length === 0) {
      return {
        direction: 'stable',
        description: 'No historical data for trend comparison.',
        evidence: []
      }
    }

    const currentAvgRate = this.calculateAverage(current, 'error_rate_percent')
    const previousAvgRate = this.calculateAverage(previous, 'error_rate_percent')
    const change = currentAvgRate - previousAvgRate

    const evidence: string[] = []
    if (Math.abs(change) > 1) {
      evidence.push(`Error rate ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(2)}%`)
      evidence.push(`Current: ${currentAvgRate.toFixed(2)}%, Previous: ${previousAvgRate.toFixed(2)}%`)
    }

    if (change > 2) {
      return {
        direction: 'degrading',
        description: 'Error rate is significantly increasing.',
        evidence
      }
    } else if (change < -2) {
      return {
        direction: 'improving',
        description: 'Error rate is significantly improving.',
        evidence
      }
    }

    return {
      direction: 'stable',
      description: 'Error rate is relatively stable.',
      evidence: evidence.length > 0 ? evidence : ['No significant changes detected']
    }
  }

  private static detectErrorAnomalies(
    metrics: ErrorMetrics[],
    avgErrorRate: number,
    total5xx: number,
    topErrors: Array<{ endpoint: string; method: string; error_count: number; error_rate_percent: number }>
  ): MetricsSummary['anomalies'] {
    const anomalies: MetricsSummary['anomalies'] = []

    if (avgErrorRate > 5) {
      anomalies.push({
        severity: 'critical',
        type: 'High Error Rate',
        description: `Error rate is ${avgErrorRate.toFixed(2)}%, exceeding 5% threshold.`,
        evidence: [
          `Average error rate: ${avgErrorRate.toFixed(2)}%`
        ],
        recommended_checks: [
          'Review error logs for patterns',
          'Check for service degradation',
          'Investigate recent deployments',
          'Review database connection issues'
        ]
      })
    } else if (avgErrorRate > 2) {
      anomalies.push({
        severity: 'high',
        type: 'Elevated Error Rate',
        description: `Error rate is ${avgErrorRate.toFixed(2)}%, above 2% threshold.`,
        evidence: [
          `Average error rate: ${avgErrorRate.toFixed(2)}%`
        ],
        recommended_checks: [
          'Monitor error trends',
          'Review top error endpoints',
          'Check for intermittent issues'
        ]
      })
    }

    if (total5xx > 10) {
      anomalies.push({
        severity: 'critical',
        type: 'High 5xx Server Errors',
        description: `${total5xx} server errors detected, indicating system issues.`,
        evidence: [
          `Total 5xx errors: ${total5xx}`
        ],
        recommended_checks: [
          'Check application logs for stack traces',
          'Review database connection pool',
          'Investigate external service dependencies',
          'Check for resource exhaustion'
        ]
      })
    }

    if (topErrors.length > 0 && topErrors[0].error_rate_percent > 10) {
      anomalies.push({
        severity: 'high',
        type: 'Endpoint with High Error Rate',
        description: `${topErrors[0].method} ${topErrors[0].endpoint} has ${topErrors[0].error_rate_percent.toFixed(1)}% error rate.`,
        evidence: [
          `${topErrors[0].method} ${topErrors[0].endpoint}: ${topErrors[0].error_count} errors (${topErrors[0].error_rate_percent.toFixed(1)}%)`
        ],
        recommended_checks: [
          'Review endpoint implementation',
          'Check input validation',
          'Investigate database queries',
          'Review error handling logic'
        ]
      })
    }

    return anomalies
  }

  private static generateErrorSummary(
    totalErrors: number,
    avgErrorRate: number,
    total4xx: number,
    total5xx: number,
    topErrors: Array<{ endpoint: string; method: string; error_count: number; error_rate_percent: number }>
  ): string {
    const parts: string[] = []
    parts.push(`Error analysis: ${totalErrors} total errors detected, ${avgErrorRate.toFixed(2)}% average error rate.`)
    parts.push(`${total4xx} client errors (4xx), ${total5xx} server errors (5xx).`)
    if (topErrors.length > 0) {
      parts.push(`Top error endpoint: ${topErrors[0].method} ${topErrors[0].endpoint} (${topErrors[0].error_count} errors, ${topErrors[0].error_rate_percent.toFixed(1)}%).`)
    }
    return parts.join(' ')
  }

  private static generateErrorChecks(
    anomalies: MetricsSummary['anomalies'],
    avgErrorRate: number,
    total5xx: number,
    topErrors: Array<{ endpoint: string; method: string; error_count: number; error_rate_percent: number }>
  ): string[] {
    const checks: string[] = []
    
    if (anomalies.length === 0) {
      checks.push('Error metrics appear healthy')
      checks.push('Continue monitoring error rates')
    } else {
      checks.push(...anomalies.flatMap(a => a.recommended_checks))
    }

    if (topErrors.length > 0) {
      checks.push(`Review top ${Math.min(3, topErrors.length)} error endpoint(s)`)
    }

    return checks
  }
}
