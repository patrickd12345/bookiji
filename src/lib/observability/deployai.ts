import { getServerSupabase } from '@/lib/supabaseClient'
import { sloai } from './sloai'

const supabase = getServerSupabase()

export interface Deployment {
  id: string
  version: string
  environment: 'canary' | 'production' | 'staging'
  commit_sha?: string
  branch?: string
  deployed_by?: string
  deployed_at: string
  status: 'deploying' | 'active' | 'promoted' | 'rolled_back' | 'failed'
  url?: string
  metadata?: Record<string, any>
  promoted_at?: string
  rolled_back_at?: string
}

export interface DeploymentMetrics {
  error_rate: number
  p95_latency: number
  p99_latency: number
  throughput: number
  availability: number
  sample_count: number
  time_window_minutes: number
  collected_at: string
}

export interface CanaryComparison {
  canary: Deployment
  baseline: Deployment | null
  metrics: {
    canary: DeploymentMetrics
    baseline: DeploymentMetrics | null
  }
  comparison: {
    error_rate_diff: number // canary - baseline (positive = worse)
    p95_latency_diff: number
    p99_latency_diff: number
    throughput_diff: number
    availability_diff: number
  }
  slo_alignment: {
    canary_meets_slo: boolean
    baseline_meets_slo: boolean | null
    canary_violations: number
    baseline_violations: number
  }
}

export interface DeploymentRecommendation {
  action: 'promote' | 'rollback' | 'monitor' | 'extend_canary'
  confidence: 'high' | 'medium' | 'low'
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  reasoning: string[]
  metrics: {
    error_rate: { canary: number; baseline: number | null; threshold: number }
    p95_latency: { canary: number; baseline: number | null; threshold: number }
    p99_latency: { canary: number; baseline: number | null; threshold: number }
  }
  slo_status: {
    canary: boolean
    baseline: boolean | null
  }
  customer_impact: string
}

/**
 * DeployAI - Deployment and Canary Advisor
 * 
 * Interprets canary signals, compares canary vs baseline performance,
 * checks error rates, p95 latency, and SLO alignment.
 * Recommends promotion or rollback (but NEVER performs actions).
 */
export class DeployAI {
  /**
   * Get current deployment status
   */
  async getDeploymentStatus(): Promise<{
    canary: Deployment | null
    production: Deployment | null
    staging: Deployment | null
  }> {
    const { data: deployments, error } = await supabase
      .from('deployments')
      .select('*')
      .in('status', ['active', 'deploying'])
      .order('deployed_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch deployments:', error)
      return { canary: null, production: null, staging: null }
    }

    const canary = deployments?.find(d => d.environment === 'canary') || null
    const production = deployments?.find(d => d.environment === 'production') || null
    const staging = deployments?.find(d => d.environment === 'staging') || null

    return { canary, production, staging }
  }

  /**
   * Get canary deployment details
   */
  async getCanaryDeployment(): Promise<Deployment | null> {
    const { data, error } = await supabase
      .from('deployments')
      .select('*')
      .eq('environment', 'canary')
      .in('status', ['active', 'deploying'])
      .order('deployed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return data as Deployment
  }

  /**
   * Get baseline (production) deployment details
   */
  async getBaselineDeployment(): Promise<Deployment | null> {
    const { data, error } = await supabase
      .from('deployments')
      .select('*')
      .eq('environment', 'production')
      .eq('status', 'active')
      .order('deployed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return data as Deployment
  }

  /**
   * Get metrics for a deployment
   */
  async getDeploymentMetrics(deploymentId: string, timeWindowMinutes: number = 15): Promise<DeploymentMetrics | null> {
    const windowStart = new Date(Date.now() - timeWindowMinutes * 60 * 1000)

    const { data: metrics, error } = await supabase
      .from('deployment_metrics')
      .select('*')
      .eq('deployment_id', deploymentId)
      .gte('collected_at', windowStart.toISOString())
      .order('collected_at', { ascending: false })

    if (error || !metrics || metrics.length === 0) {
      return null
    }

    // Aggregate metrics by type
    const aggregated: Partial<DeploymentMetrics> = {
      sample_count: 0,
      time_window_minutes: timeWindowMinutes,
      collected_at: metrics[0].collected_at
    }

    metrics.forEach(metric => {
      if (metric.metric_type === 'error_rate') {
        aggregated.error_rate = Number(metric.metric_value)
      } else if (metric.metric_type === 'p95_latency') {
        aggregated.p95_latency = Number(metric.metric_value)
      } else if (metric.metric_type === 'p99_latency') {
        aggregated.p99_latency = Number(metric.metric_value)
      } else if (metric.metric_type === 'throughput') {
        aggregated.throughput = Number(metric.metric_value)
      } else if (metric.metric_type === 'availability') {
        aggregated.availability = Number(metric.metric_value)
      }
      aggregated.sample_count = (aggregated.sample_count || 0) + (metric.sample_count || 0)
    })

    // If metrics are missing, fetch from live metrics endpoints
    if (!aggregated.error_rate || !aggregated.p95_latency) {
      const liveMetrics = await this.fetchLiveMetrics(deploymentId)
      return {
        error_rate: aggregated.error_rate ?? liveMetrics.error_rate ?? 0,
        p95_latency: aggregated.p95_latency ?? liveMetrics.p95_latency ?? 0,
        p99_latency: aggregated.p99_latency ?? liveMetrics.p99_latency ?? 0,
        throughput: aggregated.throughput ?? liveMetrics.throughput ?? 0,
        availability: aggregated.availability ?? liveMetrics.availability ?? 100,
        sample_count: aggregated.sample_count ?? 0,
        time_window_minutes: timeWindowMinutes,
        collected_at: new Date().toISOString()
      }
    }

    return aggregated as DeploymentMetrics
  }

  /**
   * Fetch live metrics from metrics endpoints
   */
  private async fetchLiveMetrics(deploymentId: string): Promise<Partial<DeploymentMetrics>> {
    // This would fetch from /ops/metrics/* endpoints
    // For now, return defaults - in production, this would make HTTP requests
    return {
      error_rate: 0,
      p95_latency: 0,
      p99_latency: 0,
      throughput: 0,
      availability: 100
    }
  }

  /**
   * Compare canary vs baseline
   */
  async compareCanaryBaseline(): Promise<CanaryComparison | null> {
    const canary = await this.getCanaryDeployment()
    if (!canary) {
      return null
    }

    const baseline = await this.getBaselineDeployment()
    const canaryMetrics = await this.getDeploymentMetrics(canary.id) || this.getDefaultMetrics()
    const baselineMetrics = baseline ? (await this.getDeploymentMetrics(baseline.id) || this.getDefaultMetrics()) : null

    // Get SLO alignment
    const sloStatus = await sloai.assessOverallStatus()

    return {
      canary,
      baseline,
      metrics: {
        canary: canaryMetrics,
        baseline: baselineMetrics
      },
      comparison: {
        error_rate_diff: baselineMetrics ? canaryMetrics.error_rate - baselineMetrics.error_rate : canaryMetrics.error_rate,
        p95_latency_diff: baselineMetrics ? canaryMetrics.p95_latency - baselineMetrics.p95_latency : canaryMetrics.p95_latency,
        p99_latency_diff: baselineMetrics ? canaryMetrics.p99_latency - baselineMetrics.p99_latency : canaryMetrics.p99_latency,
        throughput_diff: baselineMetrics ? canaryMetrics.throughput - baselineMetrics.throughput : canaryMetrics.throughput,
        availability_diff: baselineMetrics ? canaryMetrics.availability - baselineMetrics.availability : canaryMetrics.availability - 100
      },
      slo_alignment: {
        canary_meets_slo: sloStatus.insideBudget,
        baseline_meets_slo: baseline ? sloStatus.insideBudget : null,
        canary_violations: sloStatus.riskLevel === 'critical' ? 10 : sloStatus.riskLevel === 'high' ? 5 : 0,
        baseline_violations: 0
      }
    }
  }

  /**
   * Get default metrics (used when no metrics available)
   */
  private getDefaultMetrics(): DeploymentMetrics {
    return {
      error_rate: 0,
      p95_latency: 0,
      p99_latency: 0,
      throughput: 0,
      availability: 100,
      sample_count: 0,
      time_window_minutes: 15,
      collected_at: new Date().toISOString()
    }
  }

  /**
   * Generate deployment recommendation
   */
  async generateRecommendation(): Promise<DeploymentRecommendation> {
    const comparison = await this.compareCanaryBaseline()
    
    if (!comparison) {
      return {
        action: 'monitor',
        confidence: 'low',
        risk_level: 'low',
        reasoning: ['No active canary deployment found'],
        metrics: {
          error_rate: { canary: 0, baseline: null, threshold: 0.01 },
          p95_latency: { canary: 0, baseline: null, threshold: 500 },
          p99_latency: { canary: 0, baseline: null, threshold: 1000 }
        },
        slo_status: {
          canary: false,
          baseline: null
        },
        customer_impact: 'No canary deployment active'
      }
    }

    const { canary, baseline, metrics, comparison: comp, slo_alignment } = comparison

    // Thresholds (conservative - fact-based, not optimistic)
    const ERROR_RATE_THRESHOLD = 0.01 // 1% error rate
    const P95_LATENCY_THRESHOLD = 500 // 500ms
    const P99_LATENCY_THRESHOLD = 1000 // 1s
    const ERROR_RATE_DEGRADATION_THRESHOLD = 0.005 // 0.5% worse than baseline
    const LATENCY_DEGRADATION_THRESHOLD = 100 // 100ms worse than baseline

    const reasoning: string[] = []
    let action: 'promote' | 'rollback' | 'monitor' | 'extend_canary' = 'monitor'
    let confidence: 'high' | 'medium' | 'low' = 'medium'
    let risk_level: 'low' | 'medium' | 'high' | 'critical' = 'low'
    let customer_impact = ''

    // Check error rate
    const errorRateExceedsThreshold = metrics.canary.error_rate > ERROR_RATE_THRESHOLD
    const errorRateWorseThanBaseline = baseline && comp.error_rate_diff > ERROR_RATE_DEGRADATION_THRESHOLD

    if (errorRateExceedsThreshold) {
      reasoning.push(`Error rate ${(metrics.canary.error_rate * 100).toFixed(2)}% exceeds threshold ${(ERROR_RATE_THRESHOLD * 100).toFixed(2)}%`)
      risk_level = 'high'
      action = 'rollback'
      confidence = 'high'
    } else if (errorRateWorseThanBaseline) {
      reasoning.push(`Error rate ${(comp.error_rate_diff * 100).toFixed(2)}% worse than baseline`)
      risk_level = 'medium'
      action = 'rollback'
      confidence = 'medium'
    }

    // Check P95 latency
    const p95ExceedsThreshold = metrics.canary.p95_latency > P95_LATENCY_THRESHOLD
    const p95WorseThanBaseline = baseline && comp.p95_latency_diff > LATENCY_DEGRADATION_THRESHOLD

    if (p95ExceedsThreshold) {
      reasoning.push(`P95 latency ${metrics.canary.p95_latency.toFixed(0)}ms exceeds threshold ${P95_LATENCY_THRESHOLD}ms`)
      if (risk_level === 'low') risk_level = 'high'
      if (action === 'monitor') action = 'rollback'
      confidence = 'high'
    } else if (p95WorseThanBaseline) {
      reasoning.push(`P95 latency ${comp.p95_latency_diff.toFixed(0)}ms worse than baseline`)
      if (risk_level === 'low') risk_level = 'medium'
      if (action === 'monitor') action = 'rollback'
    }

    // Check P99 latency
    const p99ExceedsThreshold = metrics.canary.p99_latency > P99_LATENCY_THRESHOLD
    const p99WorseThanBaseline = baseline && comp.p99_latency_diff > LATENCY_DEGRADATION_THRESHOLD

    if (p99ExceedsThreshold) {
      reasoning.push(`P99 latency ${metrics.canary.p99_latency.toFixed(0)}ms exceeds threshold ${P99_LATENCY_THRESHOLD}ms`)
      if (risk_level === 'low') risk_level = 'high'
      if (action === 'monitor') action = 'rollback'
      confidence = 'high'
    } else if (p99WorseThanBaseline) {
      reasoning.push(`P99 latency ${comp.p99_latency_diff.toFixed(0)}ms worse than baseline`)
      if (risk_level === 'low') risk_level = 'medium'
    }

    // Check SLO alignment
    if (!slo_alignment.canary_meets_slo) {
      reasoning.push(`Canary violates SLO targets (${slo_alignment.canary_violations} violations)`)
      risk_level = 'critical'
      action = 'rollback'
      confidence = 'high'
    }

    // If all checks pass, recommend promotion
    if (action === 'monitor' && !errorRateExceedsThreshold && !p95ExceedsThreshold && !p99ExceedsThreshold && slo_alignment.canary_meets_slo) {
      // But be conservative - need sufficient sample size
      if (metrics.canary.sample_count < 100) {
        action = 'extend_canary'
        reasoning.push(`Insufficient sample size (${metrics.canary.sample_count} samples). Need at least 100 samples for promotion.`)
        confidence = 'low'
      } else {
        action = 'promote'
        reasoning.push('All metrics within acceptable thresholds')
        reasoning.push('SLO targets met')
        reasoning.push(`Sample size sufficient (${metrics.canary.sample_count} samples)`)
        confidence = 'high'
        risk_level = 'low'
      }
    }

    // Generate customer impact
    if (risk_level === 'critical') {
      customer_impact = 'Critical degradation detected. Users are experiencing significant issues. Immediate rollback recommended.'
    } else if (risk_level === 'high') {
      customer_impact = 'Significant performance degradation. Many users may experience errors or slow responses.'
    } else if (risk_level === 'medium') {
      customer_impact = 'Moderate performance degradation. Some users may notice slower responses.'
    } else {
      customer_impact = 'Performance within acceptable limits. No significant customer impact expected.'
    }

    return {
      action,
      confidence,
      risk_level,
      reasoning,
      metrics: {
        error_rate: {
          canary: metrics.canary.error_rate,
          baseline: baseline ? metrics.baseline?.error_rate ?? null : null,
          threshold: ERROR_RATE_THRESHOLD
        },
        p95_latency: {
          canary: metrics.canary.p95_latency,
          baseline: baseline ? metrics.baseline?.p95_latency ?? null : null,
          threshold: P95_LATENCY_THRESHOLD
        },
        p99_latency: {
          canary: metrics.canary.p99_latency,
          baseline: baseline ? metrics.baseline?.p99_latency ?? null : null,
          threshold: P99_LATENCY_THRESHOLD
        }
      },
      slo_status: {
        canary: slo_alignment.canary_meets_slo,
        baseline: baseline ? slo_alignment.baseline_meets_slo : null
      },
      customer_impact
    }
  }

  /**
   * Get deployment events
   */
  async getDeploymentEvents(deploymentId?: string, limit: number = 50): Promise<any[]> {
    let query = supabase
      .from('deployment_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (deploymentId) {
      query = query.eq('deployment_id', deploymentId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch deployment events:', error)
      return []
    }

    return data || []
  }
}

// Export singleton instance
export const deployai = new DeployAI()
