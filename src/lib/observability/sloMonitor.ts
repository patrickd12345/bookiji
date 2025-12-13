import { getServerSupabase } from '@/lib/supabaseServer'

const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>

export interface SLOConfig {
  metric_name: string
  target_p95_ms: number
  target_p99_ms: number
  target_error_rate: number
  target_cache_hit_rate: number
  warning_threshold_multiplier: number
  critical_threshold_multiplier: number
}

export interface SLOViolation {
  id: number
  metric_name: string
  violation_type: 'p95' | 'p99' | 'error_rate' | 'cache_hit_rate'
  current_value: number
  threshold_value: number
  severity: 'warning' | 'critical'
  endpoint?: string
  bucket: string
  violation_count: number
  first_violation_at: string
  last_violation_at: string
  resolved_at?: string
  resolved_by?: string
}

export interface SLOComplianceResult {
  violations: SLOViolation[]
  summary: {
    total_violations: number
    warning_count: number
    critical_count: number
    compliance_rate: number
  }
}

export class SLOMonitor {
  private static instance: SLOMonitor
  private checkInterval?: NodeJS.Timeout
  private isMonitoring = false

  static getInstance(): SLOMonitor {
    if (!SLOMonitor.instance) {
      SLOMonitor.instance = new SLOMonitor()
    }
    return SLOMonitor.instance
  }

  /**
   * Start continuous SLO monitoring
   */
  startMonitoring(intervalMs: number = 5 * 60 * 1000): void {
    if (this.isMonitoring) {
      console.log('SLO monitoring already active')
      return
    }

    this.isMonitoring = true
    this.checkInterval = setInterval(async () => {
      try {
        await this.checkSLOCompliance()
      } catch (error) {
        console.error('SLO compliance check failed:', error)
      }
    }, intervalMs)

    console.log(`SLO monitoring started with ${intervalMs}ms interval`)
  }

  /**
   * Stop SLO monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = undefined
    }
    this.isMonitoring = false
    console.log('SLO monitoring stopped')
  }

  /**
   * Check SLO compliance and record violations
   */
  async checkSLOCompliance(): Promise<SLOComplianceResult> {
    try {
      // Call the database function to check SLO compliance
      const { data, error } = await supabase.rpc('check_slo_compliance')
      
      if (error) {
        throw new Error(`SLO compliance check failed: ${error.message}`)
      }

      // Get current violations
      const { data: violations, error: violationsError } = await supabase
        .from('slo_violations')
        .select('*')
        .is('resolved_at', null)
        .order('last_violation_at', { ascending: false })

      if (violationsError) {
        throw new Error(`Failed to fetch SLO violations: ${violationsError.message}`)
      }

      const result: SLOComplianceResult = {
        violations: violations || [],
        summary: {
          total_violations: violations?.length || 0,
          warning_count: violations?.filter(v => v.severity === 'warning').length || 0,
          critical_count: violations?.filter(v => v.severity === 'critical').length || 0,
          compliance_rate: 100 // Will be calculated based on total checks
        }
      }

      // Alert on critical violations
      const criticalViolations = violations?.filter(v => v.severity === 'critical') || []
      if (criticalViolations.length > 0) {
        await this.alertCriticalViolations(criticalViolations)
      }

      return result
    } catch (error) {
      console.error('SLO compliance check failed:', error)
      throw error
    }
  }

  /**
   * Get SLO configuration
   */
  async getSLOConfig(): Promise<SLOConfig[]> {
    const { data, error } = await supabase
      .from('slo_config')
      .select('*')
      .order('metric_name')

    if (error) {
      throw new Error(`Failed to fetch SLO config: ${error.message}`)
    }

    return data || []
  }

  /**
   * Update SLO configuration
   */
  async updateSLOConfig(config: Partial<SLOConfig> & { metric_name: string }): Promise<void> {
    const { error } = await supabase
      .from('slo_config')
      .upsert(config, { onConflict: 'metric_name' })

    if (error) {
      throw new Error(`Failed to update SLO config: ${error.message}`)
    }
  }

  /**
   * Resolve SLO violation
   */
  async resolveViolation(violationId: number, resolvedBy: string): Promise<void> {
    const { error } = await supabase
      .from('slo_violations')
      .update({ 
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy
      })
      .eq('id', violationId)

    if (error) {
      throw new Error(`Failed to resolve SLO violation: ${error.message}`)
    }
  }

  /**
   * Get violation history
   */
  async getViolationHistory(
    metricName?: string,
    severity?: 'warning' | 'critical',
    days: number = 7
  ): Promise<SLOViolation[]> {
    let query = supabase
      .from('slo_violations')
      .select('*')
      .gte('first_violation_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('first_violation_at', { ascending: false })

    if (metricName) {
      query = query.eq('metric_name', metricName)
    }

    if (severity) {
      query = query.eq('severity', severity)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch violation history: ${error.message}`)
    }

    return data || []
  }

  /**
   * Alert on critical violations
   */
  private async alertCriticalViolations(violations: SLOViolation[]): Promise<void> {
    // Log critical violations
    console.error(`🚨 CRITICAL SLO VIOLATIONS DETECTED:`, violations)

    // TODO: Implement actual alerting (email, Slack, PagerDuty, etc.)
    // For now, just log to console and could send to error monitoring service
    
    // Example: Send to Sentry or other error monitoring
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      violations.forEach(violation => {
        (window as any).Sentry.captureMessage(`Critical SLO Violation: ${violation.metric_name}`, {
          level: 'error',
          tags: {
            metric: violation.metric_name,
            type: violation.violation_type,
            endpoint: violation.endpoint,
            severity: violation.severity
          },
          extra: {
            current_value: violation.current_value,
            threshold_value: violation.threshold_value,
            violation_count: violation.violation_count
          }
        })
      })
    }
  }

  /**
   * Get compliance dashboard data
   */
  async getComplianceDashboard(): Promise<{
    currentStatus: 'healthy' | 'warning' | 'critical'
    metrics: Array<{
      name: string
      current_p95: number
      target_p95: number
      current_p99: number
      target_p99: number
      current_error_rate: number
      target_error_rate: number
      status: 'healthy' | 'warning' | 'critical'
    }>
    recentViolations: SLOViolation[]
  }> {
    try {
      const [config, violations] = await Promise.all([
        this.getSLOConfig(),
        this.getViolationHistory(undefined, undefined, 1) // Last 24 hours
      ])

      // Get current performance metrics (this would need to be implemented based on your metrics collection)
      const currentMetrics = await this.getCurrentPerformanceMetrics()

      const dashboard = {
        currentStatus: 'healthy' as 'healthy' | 'warning' | 'critical',
        metrics: config.map(cfg => {
          const current = currentMetrics.find(m => m.metric_name === cfg.metric_name)
          const status = this.calculateMetricStatus(cfg, current)
          
          return {
            name: cfg.metric_name,
            current_p95: current?.p95_ms || 0,
            target_p95: cfg.target_p95_ms,
            current_p99: current?.p99_ms || 0,
            target_p99: cfg.target_p99_ms,
            current_error_rate: current?.error_rate || 0,
            target_error_rate: cfg.target_error_rate,
            status
          }
        }),
        recentViolations: violations
      }

      // Determine overall status
      if (dashboard.metrics.some(m => m.status === 'critical')) {
        dashboard.currentStatus = 'critical'
      } else if (dashboard.metrics.some(m => m.status === 'warning')) {
        dashboard.currentStatus = 'warning'
      }

      return dashboard
    } catch (error) {
      console.error('Failed to get compliance dashboard:', error)
      throw error
    }
  }

  /**
   * Calculate metric status based on current values vs targets
   */
  private calculateMetricStatus(
    config: SLOConfig, 
    current?: { p95_ms: number; p99_ms: number; error_rate: number }
  ): 'healthy' | 'warning' | 'critical' {
    if (!current) return 'healthy'

    const p95Status = this.calculateThresholdStatus(
      current.p95_ms, 
      config.target_p95_ms, 
      config.warning_threshold_multiplier, 
      config.critical_threshold_multiplier
    )

    const p99Status = this.calculateThresholdStatus(
      current.p99_ms, 
      config.target_p99_ms, 
      config.warning_threshold_multiplier, 
      config.critical_threshold_multiplier
    )

    const errorRateStatus = this.calculateThresholdStatus(
      current.error_rate, 
      config.target_error_rate, 
      config.warning_threshold_multiplier, 
      config.critical_threshold_multiplier
    )

    if ([p95Status, p99Status, errorRateStatus].includes('critical')) {
      return 'critical'
    } else if ([p95Status, p99Status, errorRateStatus].includes('warning')) {
      return 'warning'
    }

    return 'healthy'
  }

  /**
   * Calculate threshold status for a single metric
   */
  private calculateThresholdStatus(
    current: number, 
    target: number, 
    warningMultiplier: number, 
    criticalMultiplier: number
  ): 'healthy' | 'warning' | 'critical' {
    if (current > target * criticalMultiplier) {
      return 'critical'
    } else if (current > target * warningMultiplier) {
      return 'warning'
    }
    return 'healthy'
  }

  /**
   * Get current performance metrics (placeholder - implement based on your metrics collection)
   */
  private async getCurrentPerformanceMetrics(): Promise<Array<{
    metric_name: string
    p95_ms: number
    p99_ms: number
    error_rate: number
  }>> {
    // This would need to be implemented based on how you collect performance metrics
    // For now, return empty array
    return []
  }
}

// Export singleton instance
export const sloMonitor = SLOMonitor.getInstance()
