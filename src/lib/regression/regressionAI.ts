/**
 * RegressionAI - Bookiji's regression detection expert
 * 
 * Responsibilities:
 * - Compare current metrics to historical baselines
 * - Detect P95 degradations
 * - Identify booking flow slowdowns
 * - Detect error bumps after deploys
 * - Recommend investigation targets
 * 
 * Output style:
 * - Compare "Now vs Normal"
 * - Quantify impact
 */

import type { P95Metrics, BookingMetrics, ErrorMetrics, SystemMetrics } from '../metrics/metricsAI'

export interface Baseline {
  id: string
  metric_type: 'p95' | 'booking' | 'error' | 'system'
  endpoint?: string // For endpoint-specific baselines
  period: 'normal' | 'peak' | 'low'
  timestamp: string
  data: BaselineData
  metadata?: {
    deploy_id?: string
    commit_sha?: string
    notes?: string
  }
}

export interface BaselineData {
  // P95 baseline
  p95_latency_ms?: number
  p99_latency_ms?: number
  avg_latency_ms?: number
  
  // Booking baseline
  bookings_per_hour?: number
  conversion_rate?: number
  avg_booking_duration_ms?: number
  
  // Error baseline
  error_rate_percent?: number
  error_count_per_hour?: number
  
  // System baseline
  cpu_percent?: number
  memory_percent?: number
  cache_hit_rate?: number
}

export interface Regression {
  id: string
  metric_type: 'p95' | 'booking' | 'error' | 'system'
  endpoint?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  current_value: number
  baseline_value: number
  percent_change: number
  absolute_change: number
  impact: string
  detected_at: string
  related_deploy_id?: string
  recommendation: string[]
}

export interface RegressionReport {
  timestamp: string
  status: 'ok' | 'degraded' | 'critical'
  summary: string
  regressions: Regression[]
  booking_flow_slowdowns: Array<{
    endpoint: string
    current_p95_ms: number
    baseline_p95_ms: number
    slowdown_percent: number
    impact: string
  }>
  error_bumps: Array<{
    endpoint?: string
    current_error_rate: number
    baseline_error_rate: number
    increase_percent: number
    related_deploy_id?: string
    detected_after_deploy_hours?: number
  }>
  investigation_targets: Array<{
    priority: 'high' | 'medium' | 'low'
    metric_type: string
    endpoint?: string
    reason: string
    evidence: string[]
  }>
}

export class RegressionAI {
  /**
   * Detect regressions by comparing current metrics to baselines
   */
  static detectRegressions(
    currentMetrics: {
      p95?: P95Metrics[]
      booking?: BookingMetrics[]
      error?: ErrorMetrics[]
      system?: SystemMetrics[]
    },
    baselines: Baseline[]
  ): RegressionReport {
    const regressions: Regression[] = []
    const bookingFlowSlowdowns: RegressionReport['booking_flow_slowdowns'] = []
    const errorBumps: RegressionReport['error_bumps'] = []
    const investigationTargets: RegressionReport['investigation_targets'] = []

    // Detect P95 regressions
    if (currentMetrics.p95 && currentMetrics.p95.length > 0) {
      const p95Baselines = baselines.filter(b => b.metric_type === 'p95')
      const p95Regressions = this.detectP95Regressions(currentMetrics.p95, p95Baselines)
      regressions.push(...p95Regressions)

      // Identify booking flow slowdowns (critical booking endpoints)
      const bookingEndpoints = ['/api/bookings', '/api/bookings/create', '/api/quote', '/api/availability']
      for (const endpoint of bookingEndpoints) {
        const endpointMetrics = currentMetrics.p95.filter(m => m.endpoint.includes(endpoint))
        if (endpointMetrics.length > 0) {
          const endpointBaseline = p95Baselines.find(b => b.endpoint === endpoint || b.endpoint?.includes(endpoint))
          if (endpointBaseline && endpointBaseline.data.p95_latency_ms) {
            const currentP95 = this.calculateAverage(endpointMetrics, 'p95_latency_ms')
            const baselineP95 = endpointBaseline.data.p95_latency_ms
            const slowdownPercent = ((currentP95 - baselineP95) / baselineP95) * 100

            if (slowdownPercent > 20) {
              bookingFlowSlowdowns.push({
                endpoint,
                current_p95_ms: currentP95,
                baseline_p95_ms: baselineP95,
                slowdown_percent: slowdownPercent,
                impact: this.quantifyBookingImpact(slowdownPercent, currentP95)
              })
            }
          }
        }
      }
    }

    // Detect booking regressions
    if (currentMetrics.booking && currentMetrics.booking.length > 0) {
      const bookingBaselines = baselines.filter(b => b.metric_type === 'booking')
      const bookingRegressions = this.detectBookingRegressions(currentMetrics.booking, bookingBaselines)
      regressions.push(...bookingRegressions)
    }

    // Detect error regressions
    if (currentMetrics.error && currentMetrics.error.length > 0) {
      const errorBaselines = baselines.filter(b => b.metric_type === 'error')
      const errorRegressions = this.detectErrorRegressions(currentMetrics.error, errorBaselines)
      regressions.push(...errorRegressions)

      // Detect error bumps after deploys
      const deployBaselines = baselines.filter(b => b.metadata?.deploy_id)
      for (const baseline of deployBaselines) {
        if (baseline.metric_type === 'error' && baseline.data.error_rate_percent) {
          const currentErrorRate = this.calculateAverage(currentMetrics.error, 'error_rate_percent')
          const baselineErrorRate = baseline.data.error_rate_percent
          const increasePercent = ((currentErrorRate - baselineErrorRate) / baselineErrorRate) * 100

          if (increasePercent > 50) {
            errorBumps.push({
              endpoint: baseline.endpoint,
              current_error_rate: currentErrorRate,
              baseline_error_rate: baselineErrorRate,
              increase_percent: increasePercent,
              related_deploy_id: baseline.metadata?.deploy_id,
              detected_after_deploy_hours: this.hoursSinceBaseline(baseline.timestamp)
            })
          }
        }
      }
    }

    // Detect system regressions
    if (currentMetrics.system && currentMetrics.system.length > 0) {
      const systemBaselines = baselines.filter(b => b.metric_type === 'system')
      const systemRegressions = this.detectSystemRegressions(currentMetrics.system, systemBaselines)
      regressions.push(...systemRegressions)
    }

    // Generate investigation targets
    investigationTargets.push(...this.generateInvestigationTargets(regressions, bookingFlowSlowdowns, errorBumps))

    // Determine overall status
    const criticalCount = regressions.filter(r => r.severity === 'critical').length
    const highCount = regressions.filter(r => r.severity === 'high').length
    const status = criticalCount > 0 ? 'critical' : highCount > 0 ? 'degraded' : 'ok'

    // Generate summary
    const summary = this.generateSummary(regressions, bookingFlowSlowdowns, errorBumps, status)

    return {
      timestamp: new Date().toISOString(),
      status,
      summary,
      regressions,
      booking_flow_slowdowns: bookingFlowSlowdowns,
      error_bumps: errorBumps,
      investigation_targets: investigationTargets
    }
  }

  /**
   * Detect P95 latency regressions
   */
  private static detectP95Regressions(
    current: P95Metrics[],
    baselines: Baseline[]
  ): Regression[] {
    const regressions: Regression[] = []

    // Group current metrics by endpoint
    const endpointGroups = this.groupP95ByEndpoint(current)

    for (const [endpointKey, metrics] of endpointGroups.entries()) {
      const [method, ...endpointParts] = endpointKey.split(' ')
      const endpoint = endpointParts.join(' ')

      // Find matching baseline
      const baseline = baselines.find(b => 
        b.endpoint === endpoint || 
        b.endpoint === endpointKey ||
        (!b.endpoint && baselines.length === 1) // Use global baseline if no endpoint-specific
      )

      if (!baseline || !baseline.data.p95_latency_ms) {
        continue
      }

      const currentP95 = this.calculateAverage(metrics, 'p95_latency_ms')
      const baselineP95 = baseline.data.p95_latency_ms
      const percentChange = ((currentP95 - baselineP95) / baselineP95) * 100
      const absoluteChange = currentP95 - baselineP95

      // Threshold: >30% increase or >200ms absolute increase
      if (percentChange > 30 || absoluteChange > 200) {
        const severity = percentChange > 100 || absoluteChange > 500 
          ? 'critical' 
          : percentChange > 50 || absoluteChange > 300 
          ? 'high' 
          : 'medium'

        regressions.push({
          id: `p95-${endpointKey}-${Date.now()}`,
          metric_type: 'p95',
          endpoint,
          severity,
          current_value: currentP95,
          baseline_value: baselineP95,
          percent_change: percentChange,
          absolute_change: absoluteChange,
          impact: this.quantifyP95Impact(percentChange, currentP95),
          detected_at: new Date().toISOString(),
          related_deploy_id: baseline.metadata?.deploy_id,
          recommendation: this.generateP95Recommendations(endpoint, percentChange, currentP95)
        })
      }
    }

    return regressions
  }

  /**
   * Detect booking flow regressions
   */
  private static detectBookingRegressions(
    current: BookingMetrics[],
    baselines: Baseline[]
  ): Regression[] {
    const regressions: Regression[] = []

    const baseline = baselines.find(b => b.metric_type === 'booking' && b.period === 'normal')
    if (!baseline || !baseline.data.bookings_per_hour) {
      return regressions
    }

    // Calculate current bookings per hour
    const totalBookings = current.reduce((sum, m) => sum + m.bookings_created, 0)
    const hours = current.length * (5 / 60) // 5-minute buckets
    const currentBookingsPerHour = hours > 0 ? totalBookings / hours : 0

    const baselineBookingsPerHour = baseline.data.bookings_per_hour
    const percentChange = baselineBookingsPerHour > 0 
      ? ((currentBookingsPerHour - baselineBookingsPerHour) / baselineBookingsPerHour) * 100 
      : 0

    // Threshold: >20% decrease
    if (percentChange < -20) {
      regressions.push({
        id: `booking-${Date.now()}`,
        metric_type: 'booking',
        severity: percentChange < -50 ? 'critical' : 'high',
        current_value: currentBookingsPerHour,
        baseline_value: baselineBookingsPerHour,
        percent_change: percentChange,
        absolute_change: currentBookingsPerHour - baselineBookingsPerHour,
        impact: `Booking throughput decreased by ${Math.abs(percentChange).toFixed(1)}%`,
        detected_at: new Date().toISOString(),
        recommendation: [
          'Check booking API endpoints for errors',
          'Review payment processing flow',
          'Investigate user abandonment points',
          'Check for service degradation'
        ]
      })
    }

    // Check conversion rate
    if (baseline.data.conversion_rate) {
      const totalCreated = current.reduce((sum, m) => sum + m.bookings_created, 0)
      const totalConfirmed = current.reduce((sum, m) => sum + m.bookings_confirmed, 0)
      const currentConversionRate = totalCreated > 0 ? (totalConfirmed / totalCreated) * 100 : 0
      const baselineConversionRate = baseline.data.conversion_rate
      const conversionChange = currentConversionRate - baselineConversionRate

      if (conversionChange < -10) {
        regressions.push({
          id: `booking-conversion-${Date.now()}`,
          metric_type: 'booking',
          severity: conversionChange < -20 ? 'critical' : 'high',
          current_value: currentConversionRate,
          baseline_value: baselineConversionRate,
          percent_change: conversionChange,
          absolute_change: conversionChange,
          impact: `Conversion rate dropped by ${Math.abs(conversionChange).toFixed(1)}%`,
          detected_at: new Date().toISOString(),
          recommendation: [
            'Review booking confirmation flow',
            'Check payment processing errors',
            'Investigate user drop-off points',
            'Review error logs for booking endpoints'
          ]
        })
      }
    }

    return regressions
  }

  /**
   * Detect error rate regressions
   */
  private static detectErrorRegressions(
    current: ErrorMetrics[],
    baselines: Baseline[]
  ): Regression[] {
    const regressions: Regression[] = []

    const baseline = baselines.find(b => b.metric_type === 'error' && b.period === 'normal')
    if (!baseline || !baseline.data.error_rate_percent) {
      return regressions
    }

    const currentErrorRate = this.calculateAverage(current, 'error_rate_percent')
    const baselineErrorRate = baseline.data.error_rate_percent
    const percentChange = baselineErrorRate > 0 
      ? ((currentErrorRate - baselineErrorRate) / baselineErrorRate) * 100 
      : 0

    // Threshold: >50% increase or >2% absolute increase
    if (percentChange > 50 || (currentErrorRate - baselineErrorRate) > 2) {
      regressions.push({
        id: `error-${Date.now()}`,
        metric_type: 'error',
        severity: percentChange > 200 || currentErrorRate > 10 
          ? 'critical' 
          : percentChange > 100 || currentErrorRate > 5 
          ? 'high' 
          : 'medium',
        current_value: currentErrorRate,
        baseline_value: baselineErrorRate,
        percent_change: percentChange,
        absolute_change: currentErrorRate - baselineErrorRate,
        impact: `Error rate increased by ${percentChange.toFixed(1)}% (${currentErrorRate.toFixed(2)}% vs ${baselineErrorRate.toFixed(2)}%)`,
        detected_at: new Date().toISOString(),
        related_deploy_id: baseline.metadata?.deploy_id,
        recommendation: [
          'Review error logs for patterns',
          'Check recent deployments',
          'Investigate top error endpoints',
          'Review database connection issues',
          'Check external service dependencies'
        ]
      })
    }

    return regressions
  }

  /**
   * Detect system resource regressions
   */
  private static detectSystemRegressions(
    current: SystemMetrics[],
    baselines: Baseline[]
  ): Regression[] {
    const regressions: Regression[] = []

    const baseline = baselines.find(b => b.metric_type === 'system' && b.period === 'normal')
    if (!baseline) {
      return regressions
    }

    // Check CPU
    if (baseline.data.cpu_percent) {
      const currentCpu = this.calculateAverage(current, 'cpu_percent')
      const baselineCpu = baseline.data.cpu_percent
      const percentChange = ((currentCpu - baselineCpu) / baselineCpu) * 100

      if (percentChange > 30 && currentCpu > 70) {
        regressions.push({
          id: `system-cpu-${Date.now()}`,
          metric_type: 'system',
          severity: currentCpu > 90 ? 'critical' : 'high',
          current_value: currentCpu,
          baseline_value: baselineCpu,
          percent_change: percentChange,
          absolute_change: currentCpu - baselineCpu,
          impact: `CPU usage increased by ${percentChange.toFixed(1)}% (${currentCpu.toFixed(1)}% vs ${baselineCpu.toFixed(1)}%)`,
          detected_at: new Date().toISOString(),
          recommendation: [
            'Check for runaway processes',
            'Review database query performance',
            'Investigate API endpoint load',
            'Check for resource-intensive operations'
          ]
        })
      }
    }

    // Check memory
    if (baseline.data.memory_percent) {
      const currentMemory = this.calculateAverage(current, 'memory_percent')
      const baselineMemory = baseline.data.memory_percent
      const percentChange = ((currentMemory - baselineMemory) / baselineMemory) * 100

      if (percentChange > 30 && currentMemory > 80) {
        regressions.push({
          id: `system-memory-${Date.now()}`,
          metric_type: 'system',
          severity: currentMemory > 90 ? 'critical' : 'high',
          current_value: currentMemory,
          baseline_value: baselineMemory,
          percent_change: percentChange,
          absolute_change: currentMemory - baselineMemory,
          impact: `Memory usage increased by ${percentChange.toFixed(1)}% (${currentMemory.toFixed(1)}% vs ${baselineMemory.toFixed(1)}%)`,
          detected_at: new Date().toISOString(),
          recommendation: [
            'Check for memory leaks',
            'Review cache sizes',
            'Investigate connection pool usage',
            'Check for large data processing operations'
          ]
        })
      }
    }

    return regressions
  }

  /**
   * Generate investigation targets based on regressions
   */
  private static generateInvestigationTargets(
    regressions: Regression[],
    bookingSlowdowns: RegressionReport['booking_flow_slowdowns'],
    errorBumps: RegressionReport['error_bumps']
  ): RegressionReport['investigation_targets'] {
    const targets: RegressionReport['investigation_targets'] = []

    // Critical P95 regressions
    const criticalP95 = regressions.filter(r => r.metric_type === 'p95' && r.severity === 'critical')
    for (const regression of criticalP95) {
      targets.push({
        priority: 'high',
        metric_type: 'p95',
        endpoint: regression.endpoint,
        reason: `Critical P95 degradation: ${regression.percent_change.toFixed(1)}% increase`,
        evidence: [
          `Current: ${regression.current_value.toFixed(0)}ms`,
          `Baseline: ${regression.baseline_value.toFixed(0)}ms`,
          `Impact: ${regression.impact}`
        ]
      })
    }

    // Booking flow slowdowns
    for (const slowdown of bookingSlowdowns) {
      targets.push({
        priority: 'high',
        metric_type: 'booking_flow',
        endpoint: slowdown.endpoint,
        reason: `Booking flow slowdown: ${slowdown.slowdown_percent.toFixed(1)}% slower`,
        evidence: [
          `Current P95: ${slowdown.current_p95_ms.toFixed(0)}ms`,
          `Baseline P95: ${slowdown.baseline_p95_ms.toFixed(0)}ms`,
          `Impact: ${slowdown.impact}`
        ]
      })
    }

    // Error bumps after deploys
    for (const errorBump of errorBumps) {
      targets.push({
        priority: errorBump.increase_percent > 200 ? 'high' : 'medium',
        metric_type: 'error',
        endpoint: errorBump.endpoint,
        reason: `Error spike after deploy: ${errorBump.increase_percent.toFixed(1)}% increase`,
        evidence: [
          `Current error rate: ${errorBump.current_error_rate.toFixed(2)}%`,
          `Baseline error rate: ${errorBump.baseline_error_rate.toFixed(2)}%`,
          `Deploy ID: ${errorBump.related_deploy_id || 'unknown'}`,
          `Detected ${errorBump.detected_after_deploy_hours?.toFixed(1)}h after deploy`
        ]
      })
    }

    // High severity regressions
    const highSeverity = regressions.filter(r => r.severity === 'high')
    for (const regression of highSeverity.slice(0, 5)) {
      targets.push({
        priority: 'medium',
        metric_type: regression.metric_type,
        endpoint: regression.endpoint,
        reason: `High severity regression: ${regression.percent_change.toFixed(1)}% change`,
        evidence: [
          `Current: ${regression.current_value.toFixed(2)}`,
          `Baseline: ${regression.baseline_value.toFixed(2)}`,
          `Impact: ${regression.impact}`
        ]
      })
    }

    return targets
  }

  // Helper methods

  private static calculateAverage(metrics: any[], field: string): number {
    const values = metrics.map(m => m[field]).filter(v => v != null && !isNaN(v) && v > 0)
    if (values.length === 0) return 0
    return values.reduce((sum, v) => sum + v, 0) / values.length
  }

  private static groupP95ByEndpoint(metrics: P95Metrics[]): Map<string, P95Metrics[]> {
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

  private static quantifyP95Impact(percentChange: number, currentP95: number): string {
    if (percentChange > 100) {
      return `Critical: P95 latency more than doubled (${currentP95.toFixed(0)}ms)`
    } else if (percentChange > 50) {
      return `High: P95 latency increased significantly (${currentP95.toFixed(0)}ms)`
    } else if (percentChange > 30) {
      return `Moderate: P95 latency increased (${currentP95.toFixed(0)}ms)`
    }
    return `P95 latency at ${currentP95.toFixed(0)}ms`
  }

  private static quantifyBookingImpact(slowdownPercent: number, currentP95: number): string {
    if (slowdownPercent > 100) {
      return `Critical: Booking flow more than 2x slower, likely causing user abandonment`
    } else if (slowdownPercent > 50) {
      return `High: Booking flow significantly slower, may impact conversion`
    } else if (slowdownPercent > 20) {
      return `Moderate: Booking flow slower, monitor for user impact`
    }
    return `Booking flow at ${currentP95.toFixed(0)}ms`
  }

  private static generateP95Recommendations(endpoint: string, percentChange: number, currentP95: number): string[] {
    const recommendations: string[] = []

    if (percentChange > 100) {
      recommendations.push('URGENT: Investigate immediately - latency more than doubled')
    }

    recommendations.push(`Profile ${endpoint} endpoint handler`)
    recommendations.push('Review database queries for N+1 patterns')
    recommendations.push('Check for missing database indexes')
    recommendations.push('Review cache hit rates for this endpoint')
    recommendations.push('Check external API dependencies')

    if (currentP95 > 1000) {
      recommendations.push('Consider adding request timeout handling')
      recommendations.push('Review async operation patterns')
    }

    return recommendations
  }

  private static hoursSinceBaseline(timestamp: string): number {
    const baselineTime = new Date(timestamp).getTime()
    const now = Date.now()
    return (now - baselineTime) / (1000 * 60 * 60)
  }

  private static generateSummary(
    regressions: Regression[],
    bookingSlowdowns: RegressionReport['booking_flow_slowdowns'],
    errorBumps: RegressionReport['error_bumps'],
    status: RegressionReport['status']
  ): string {
    const parts: string[] = []

    if (status === 'ok') {
      return 'No regressions detected. System performance is within normal baselines.'
    }

    parts.push(`Detected ${regressions.length} regression(s)`)

    if (bookingSlowdowns.length > 0) {
      parts.push(`${bookingSlowdowns.length} booking flow slowdown(s)`)
    }

    if (errorBumps.length > 0) {
      parts.push(`${errorBumps.length} error spike(s) after deploy(s)`)
    }

    const criticalCount = regressions.filter(r => r.severity === 'critical').length
    if (criticalCount > 0) {
      parts.push(`${criticalCount} critical regression(s) requiring immediate attention`)
    }

    return parts.join(', ') + '.'
  }
}
