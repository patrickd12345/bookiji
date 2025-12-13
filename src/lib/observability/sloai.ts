import { getServerSupabase } from '@/lib/supabaseServer'
import type { SLOConfig, SLOViolation } from './sloMonitor'

const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>

export interface ErrorBudget {
  total: number // Total error budget for the period
  consumed: number // Error budget consumed
  remaining: number // Error budget remaining
  burnRate: number // Current burn rate (errors per hour)
  timeToExhaustion?: number // Hours until budget exhausted (if burn rate continues)
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export interface SLORiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  insideBudget: boolean
  errorBudget: ErrorBudget
  customerImpact: string
  humanAttentionNeeded: boolean
  recommendations: string[]
}

export interface LatencyMetrics {
  p50: number
  p95: number
  p99: number
  targetP95: number
  targetP99: number
  currentP95: number
  currentP99: number
  violations: SLOViolation[]
}

export interface ErrorMetrics {
  errorRate: number
  targetErrorRate: number
  totalRequests: number
  errorCount: number
  violations: SLOViolation[]
}

export interface AvailabilityMetrics {
  uptime: number
  targetUptime: number
  downtimeMinutes: number
  totalMinutes: number
  violations: SLOViolation[]
}

/**
 * SLOAI - SLO/SLA Interpreter for Bookiji
 * 
 * Evaluates SLO compliance, calculates error budgets, tracks burn rates,
 * and provides risk assessments with customer impact analysis.
 */
export class SLOAI {
  /**
   * Calculate error budget for a given SLO target
   * 
   * Error budget = (1 - SLO target) * time window
   * For example: 99.9% uptime over 30 days = 0.1% * 30 days = 43.2 minutes
   */
  calculateErrorBudget(
    sloTarget: number, // e.g., 0.999 for 99.9%
    timeWindowHours: number = 720 // 30 days default
  ): ErrorBudget {
    const totalBudget = (1 - sloTarget) * timeWindowHours * 60 // minutes
    const consumed = 0 // Will be calculated from actual violations
    const remaining = totalBudget - consumed
    const burnRate = 0 // Will be calculated from recent violations
    
    return {
      total: totalBudget,
      consumed,
      remaining,
      burnRate,
      riskLevel: 'low'
    }
  }

  /**
   * Calculate burn rate from recent violations
   */
  calculateBurnRate(
    violations: SLOViolation[],
    timeWindowHours: number = 1
  ): number {
    if (violations.length === 0) return 0
    
    // Count violations in the time window
    const now = new Date()
    const windowStart = new Date(now.getTime() - timeWindowHours * 60 * 60 * 1000)
    
    const recentViolations = violations.filter(v => {
      const violationTime = new Date(v.last_violation_at)
      return violationTime >= windowStart
    })
    
    // Burn rate = violations per hour
    return recentViolations.length / timeWindowHours
  }

  /**
   * Calculate time to exhaustion of error budget
   */
  calculateTimeToExhaustion(
    remainingBudget: number,
    burnRate: number
  ): number | undefined {
    if (burnRate <= 0) return undefined
    return remainingBudget / (burnRate * 60) // Convert to hours
  }

  /**
   * Assess risk level based on error budget consumption
   */
  assessRiskLevel(
    errorBudget: ErrorBudget,
    timeToExhaustion?: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const budgetConsumedPercent = (errorBudget.consumed / errorBudget.total) * 100
    
    // Critical: >80% consumed or will exhaust in <24 hours
    if (budgetConsumedPercent > 80 || (timeToExhaustion && timeToExhaustion < 24)) {
      return 'critical'
    }
    
    // High: >50% consumed or will exhaust in <7 days
    if (budgetConsumedPercent > 50 || (timeToExhaustion && timeToExhaustion < 168)) {
      return 'high'
    }
    
    // Medium: >25% consumed or will exhaust in <30 days
    if (budgetConsumedPercent > 25 || (timeToExhaustion && timeToExhaustion < 720)) {
      return 'medium'
    }
    
    return 'low'
  }

  /**
   * Get latency metrics for a specific metric name
   */
  async getLatencyMetrics(metricName: string): Promise<LatencyMetrics> {
    // Get SLO config
    const { data: configs, error: configError } = await supabase
      .from('slo_config')
      .select('*')
      .eq('metric_name', metricName)
      .single()

    if (configError || !configs) {
      throw new Error(`SLO config not found for ${metricName}`)
    }

    const config = configs as SLOConfig

    // Get recent performance metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('performance_analytics_5min')
      .select('p95_response_time_ms, avg_response_time_ms, endpoint, five_minute_bucket')
      .gte('five_minute_bucket', new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .order('five_minute_bucket', { ascending: false })
      .limit(100)

    if (metricsError) {
      console.warn('Failed to fetch performance metrics:', metricsError)
    }

    // Calculate percentiles from recent metrics
    // Use p95 from view as approximation, and avg for p50
    const responseTimes = (metrics || [])
      .map(m => m.p95_response_time_ms)
      .filter((t): t is number => typeof t === 'number')
      .sort((a, b) => a - b)

    const avgResponseTimes = (metrics || [])
      .map(m => m.avg_response_time_ms)
      .filter((t): t is number => typeof t === 'number')

    const p50 = avgResponseTimes.length > 0 
      ? avgResponseTimes.reduce((a, b) => a + b, 0) / avgResponseTimes.length 
      : 0
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)] || responseTimes[responseTimes.length - 1] || 0
    // P99 is not available in the view, use p95 * 1.5 as approximation
    const p99 = p95 * 1.5

    // Get violations
    const { data: violations } = await supabase
      .from('slo_violations')
      .select('*')
      .eq('metric_name', metricName)
      .in('violation_type', ['p95', 'p99'])
      .is('resolved_at', null)
      .order('last_violation_at', { ascending: false })

    return {
      p50,
      p95,
      p99,
      targetP95: config.target_p95_ms,
      targetP99: config.target_p99_ms,
      currentP95: p95,
      currentP99: p99,
      violations: violations || []
    }
  }

  /**
   * Get error rate metrics for a specific metric name
   */
  async getErrorMetrics(metricName: string): Promise<ErrorMetrics> {
    // Get SLO config
    const { data: configs, error: configError } = await supabase
      .from('slo_config')
      .select('*')
      .eq('metric_name', metricName)
      .single()

    if (configError || !configs) {
      throw new Error(`SLO config not found for ${metricName}`)
    }

    const config = configs as SLOConfig

    // Get recent performance metrics from hourly view for better aggregation
    const { data: metrics, error: metricsError } = await supabase
      .from('performance_analytics_hourly')
      .select('request_count, error_count, error_rate_percent')
      .gte('hour', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('hour', { ascending: false })

    if (metricsError) {
      console.warn('Failed to fetch performance metrics:', metricsError)
    }

    // Aggregate metrics
    const totalRequests = (metrics || []).reduce((sum, m) => sum + (m.request_count || 0), 0)
    const totalErrors = (metrics || []).reduce((sum, m) => sum + (m.error_count || 0), 0)
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0

    // Get violations
    const { data: violations } = await supabase
      .from('slo_violations')
      .select('*')
      .eq('metric_name', metricName)
      .eq('violation_type', 'error_rate')
      .is('resolved_at', null)
      .order('last_violation_at', { ascending: false })

    return {
      errorRate,
      targetErrorRate: config.target_error_rate,
      totalRequests,
      errorCount: totalErrors,
      violations: violations || []
    }
  }

  /**
   * Get availability metrics
   */
  async getAvailabilityMetrics(): Promise<AvailabilityMetrics> {
    // Calculate uptime from recent performance metrics
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const { data: metrics, error: metricsError } = await supabase
      .from('performance_analytics_hourly')
      .select('request_count, error_count')
      .gte('hour', oneDayAgo.toISOString())
      .order('hour', { ascending: false })

    if (metricsError) {
      console.warn('Failed to fetch performance metrics:', metricsError)
    }

    // Calculate uptime
    const totalRequests = (metrics || []).reduce((sum, m) => sum + (m.request_count || 0), 0)
    const totalErrors = (metrics || []).reduce((sum, m) => sum + (m.error_count || 0), 0)
    const successfulRequests = totalRequests - totalErrors
    const uptime = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100

    // Target uptime (99.9% default)
    const targetUptime = 99.9
    const totalMinutes = 24 * 60
    const downtimeMinutes = totalMinutes * (1 - uptime / 100)

    // Get violations
    const { data: violations } = await supabase
      .from('slo_violations')
      .select('*')
      .eq('violation_type', 'error_rate')
      .is('resolved_at', null)
      .order('last_violation_at', { ascending: false })

    return {
      uptime,
      targetUptime,
      downtimeMinutes,
      totalMinutes,
      violations: violations || []
    }
  }

  /**
   * Generate customer impact explanation
   */
  generateCustomerImpact(
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    metricType: 'latency' | 'errors' | 'availability',
    currentValue: number,
    targetValue: number
  ): string {
    const impactMap: Record<string, Record<string, string>> = {
      latency: {
        low: 'Response times are within acceptable limits. Users experience smooth interactions.',
        medium: 'Some users may notice slightly slower response times. Most interactions remain smooth.',
        high: 'Many users are experiencing noticeable delays. Booking flows may feel sluggish.',
        critical: 'Severe performance degradation. Users are experiencing significant delays that may cause frustration and abandonment.'
      },
      errors: {
        low: 'Error rates are minimal. Users can complete bookings reliably.',
        medium: 'Some users may encounter occasional errors. Most bookings complete successfully.',
        high: 'Elevated error rates. A significant portion of users may experience failed requests.',
        critical: 'Critical error rates. Many users cannot complete bookings. Immediate action required.'
      },
      availability: {
        low: 'Service is highly available. Users can access Bookiji reliably.',
        medium: 'Minor availability issues. Most users can access the service without problems.',
        high: 'Significant availability problems. Many users may experience service unavailability.',
        critical: 'Critical availability issues. Service may be partially or fully unavailable.'
      }
    }

    return impactMap[metricType]?.[riskLevel] || 'Status unknown.'
  }

  /**
   * Generate recommendations based on risk level
   */
  generateRecommendations(
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    metricType: 'latency' | 'errors' | 'availability'
  ): string[] {
    const recommendations: string[] = []

    if (riskLevel === 'critical') {
      recommendations.push('🚨 IMMEDIATE ACTION REQUIRED: Escalate to on-call engineer')
      recommendations.push('Review recent deployments and consider rollback')
      recommendations.push('Check infrastructure health (database, cache, external services)')
      recommendations.push('Monitor error logs for root cause')
    } else if (riskLevel === 'high') {
      recommendations.push('⚠️ High risk detected: Schedule investigation within 4 hours')
      recommendations.push('Review performance metrics and identify degradation patterns')
      recommendations.push('Check for resource constraints (CPU, memory, database connections)')
    } else if (riskLevel === 'medium') {
      recommendations.push('📊 Monitor closely: Review trends over next 24 hours')
      recommendations.push('Consider performance optimizations if trend continues')
    } else {
      recommendations.push('✅ Within SLO targets: Continue monitoring')
    }

    return recommendations
  }

  /**
   * Assess overall SLO status
   */
  async assessOverallStatus(): Promise<SLORiskAssessment> {
    // Get all SLO configs
    const { data: configs } = await supabase
      .from('slo_config')
      .select('*')

    if (!configs || configs.length === 0) {
      return {
        riskLevel: 'low',
        insideBudget: true,
        errorBudget: {
          total: 0,
          consumed: 0,
          remaining: 0,
          burnRate: 0,
          riskLevel: 'low'
        },
        customerImpact: 'SLO monitoring not configured.',
        humanAttentionNeeded: false,
        recommendations: ['Configure SLO targets in slo_config table']
      }
    }

    // Get all unresolved violations
    const { data: violations } = await supabase
      .from('slo_violations')
      .select('*')
      .is('resolved_at', null)
      .order('last_violation_at', { ascending: false })

    const criticalViolations = (violations || []).filter(v => v.severity === 'critical')
    const warningViolations = (violations || []).filter(v => v.severity === 'warning')

    // Determine overall risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (criticalViolations.length > 0) {
      riskLevel = 'critical'
    } else if (criticalViolations.length === 0 && warningViolations.length > 5) {
      riskLevel = 'high'
    } else if (warningViolations.length > 0) {
      riskLevel = 'medium'
    }

    // Calculate error budget (using 99.9% uptime target)
    const errorBudget = this.calculateErrorBudget(0.999, 720) // 30 days
    const burnRate = this.calculateBurnRate(violations || [], 24) // Last 24 hours
    const timeToExhaustion = this.calculateTimeToExhaustion(errorBudget.remaining, burnRate)
    errorBudget.burnRate = burnRate
    errorBudget.timeToExhaustion = timeToExhaustion
    errorBudget.riskLevel = this.assessRiskLevel(errorBudget, timeToExhaustion)

    const insideBudget = riskLevel === 'low' || riskLevel === 'medium'

    return {
      riskLevel,
      insideBudget,
      errorBudget,
      customerImpact: this.generateCustomerImpact(riskLevel, 'availability', 0, 99.9),
      humanAttentionNeeded: riskLevel === 'critical' || riskLevel === 'high',
      recommendations: this.generateRecommendations(riskLevel, 'availability')
    }
  }
}

// Export singleton instance
export const sloai = new SLOAI()