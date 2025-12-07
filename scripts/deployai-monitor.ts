#!/usr/bin/env tsx
/**
 * DeployAI - Deployment and Canary Advisor
 * 
 * Advisor for canaries, rollbacks, and deployment safety.
 * 
 * Responsibilities:
 * - Interpret canary signals
 * - Compare canary vs baseline performance
 * - Check error rates, p95 latency, and SLO alignment
 * - Recommend promotion or rollback
 * - NEVER perform the deploy or rollback yourself
 * 
 * Scope:
 * - /ops/deploy/status
 * - /ops/deploy/canary
 * - /ops/deploy/baseline
 * - /ops/metrics/* (read-only)
 * - /ops/events/deploy/*
 * 
 * Output style:
 * - Risk-aware
 * - Evidence-driven
 * - Never optimistic—factual and conservative
 * - Recommendations must include metrics
 */

interface DeploymentStatus {
  agent: string
  timestamp: string
  deployments: {
    canary: any
    production: any
    staging: any
  }
  summary: {
    has_canary: boolean
    has_production: boolean
    has_staging: boolean
    active_deployments: number
  }
}

interface CanaryInfo {
  agent: string
  timestamp: string
  canary: {
    deployment: any
    metrics: any
    comparison: any
  } | null
  message?: string
}

interface BaselineInfo {
  agent: string
  timestamp: string
  baseline: {
    deployment: any
    metrics: any
  } | null
  message?: string
}

interface Recommendation {
  agent: string
  timestamp: string
  recommendation: {
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
  note: string
}

class DeployAIMonitor {
  private baseUrl: string

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  /**
   * Monitor all deployment endpoints and generate report
   */
  async monitor(): Promise<void> {
    console.log('🟪 DeployAI: Deployment and Canary Advisor\n')
    console.log(`📍 Base URL: ${this.baseUrl}\n`)

    try {
      // Fetch all deployment information
      const [status, canary, baseline, recommendation] = await Promise.allSettled([
        this.fetchStatus(),
        this.fetchCanary(),
        this.fetchBaseline(),
        this.fetchRecommendation()
      ])

      // Display status
      this.displayStatus(
        status.status === 'fulfilled' ? status.value : null,
        status.status === 'rejected' ? status.reason : null
      )

      // Display canary information
      this.displayCanary(
        canary.status === 'fulfilled' ? canary.value : null,
        canary.status === 'rejected' ? canary.reason : null
      )

      // Display baseline information
      this.displayBaseline(
        baseline.status === 'fulfilled' ? baseline.value : null,
        baseline.status === 'rejected' ? baseline.reason : null
      )

      // Display recommendation
      this.displayRecommendation(
        recommendation.status === 'fulfilled' ? recommendation.value : null,
        recommendation.status === 'rejected' ? recommendation.reason : null
      )

    } catch (error) {
      console.error('❌ DeployAI monitoring failed:', error)
      process.exit(1)
    }
  }

  /**
   * Fetch deployment status
   */
  private async fetchStatus(): Promise<DeploymentStatus> {
    const response = await fetch(`${this.baseUrl}/api/ops/deploy/status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DeployAI-Monitor/1.0'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Fetch canary information
   */
  private async fetchCanary(): Promise<CanaryInfo> {
    const response = await fetch(`${this.baseUrl}/api/ops/deploy/canary`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DeployAI-Monitor/1.0'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Fetch baseline information
   */
  private async fetchBaseline(): Promise<BaselineInfo> {
    const response = await fetch(`${this.baseUrl}/api/ops/deploy/baseline`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DeployAI-Monitor/1.0'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Fetch recommendation
   */
  private async fetchRecommendation(): Promise<Recommendation> {
    const response = await fetch(`${this.baseUrl}/api/ops/deploy/recommendation`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DeployAI-Monitor/1.0'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Display deployment status
   */
  private displayStatus(status: DeploymentStatus | null, error: any): void {
    console.log('📊 Deployment Status')
    console.log('═'.repeat(60))

    if (error) {
      console.log(`❌ Error: ${error.message || error}\n`)
      return
    }

    if (!status) {
      console.log('⚠️  No status data available\n')
      return
    }

    console.log(`   Canary: ${status.summary.has_canary ? '✅ Active' : '❌ None'}`)
    console.log(`   Production: ${status.summary.has_production ? '✅ Active' : '❌ None'}`)
    console.log(`   Staging: ${status.summary.has_staging ? '✅ Active' : '❌ None'}`)
    console.log(`   Active Deployments: ${status.summary.active_deployments}\n`)

    if (status.deployments.canary) {
      console.log(`   Canary Version: ${status.deployments.canary.version}`)
      console.log(`   Canary Status: ${status.deployments.canary.status}`)
      console.log(`   Deployed At: ${new Date(status.deployments.canary.deployed_at).toLocaleString()}`)
    }

    if (status.deployments.production) {
      console.log(`   Production Version: ${status.deployments.production.version}`)
      console.log(`   Production Status: ${status.deployments.production.status}`)
      console.log(`   Deployed At: ${new Date(status.deployments.production.deployed_at).toLocaleString()}`)
    }

    console.log()
  }

  /**
   * Display canary information
   */
  private displayCanary(canary: CanaryInfo | null, error: any): void {
    console.log('🔬 Canary Deployment Analysis')
    console.log('═'.repeat(60))

    if (error) {
      console.log(`❌ Error: ${error.message || error}\n`)
      return
    }

    if (!canary || !canary.canary) {
      console.log('⚠️  No active canary deployment\n')
      return
    }

    const { deployment, metrics, comparison } = canary.canary

    console.log(`Version: ${deployment.version}`)
    console.log(`Status: ${deployment.status}`)
    console.log(`URL: ${deployment.url || 'N/A'}`)
    console.log(`Deployed: ${new Date(deployment.deployed_at).toLocaleString()}\n`)

    if (metrics) {
      console.log('📈 Metrics (Last 15 minutes):')
      console.log(`   Error Rate: ${(metrics.error_rate * 100).toFixed(3)}%`)
      console.log(`   P95 Latency: ${metrics.p95_latency.toFixed(0)}ms`)
      console.log(`   P99 Latency: ${metrics.p99_latency.toFixed(0)}ms`)
      console.log(`   Throughput: ${metrics.throughput.toFixed(0)} req/s`)
      console.log(`   Availability: ${metrics.availability.toFixed(2)}%`)
      console.log(`   Sample Count: ${metrics.sample_count}`)
      console.log()
    }

    if (comparison && comparison.vs_baseline) {
      console.log('📊 Comparison vs Baseline:')
      const { vs_baseline, slo_alignment } = comparison
      
      const errorDiff = vs_baseline.error_rate_diff * 100
      const p95Diff = vs_baseline.p95_latency_diff
      const p99Diff = vs_baseline.p99_latency_diff

      console.log(`   Error Rate: ${errorDiff >= 0 ? '+' : ''}${errorDiff.toFixed(3)}% ${errorDiff > 0 ? '⚠️' : '✅'}`)
      console.log(`   P95 Latency: ${p95Diff >= 0 ? '+' : ''}${p95Diff.toFixed(0)}ms ${p95Diff > 100 ? '⚠️' : '✅'}`)
      console.log(`   P99 Latency: ${p99Diff >= 0 ? '+' : ''}${p99Diff.toFixed(0)}ms ${p99Diff > 100 ? '⚠️' : '✅'}`)
      console.log()
      console.log(`   SLO Alignment: ${slo_alignment.canary_meets_slo ? '✅ Meets SLO' : '❌ Violates SLO'}`)
      console.log(`   SLO Violations: ${slo_alignment.canary_violations}`)
      console.log()
    }
  }

  /**
   * Display baseline information
   */
  private displayBaseline(baseline: BaselineInfo | null, error: any): void {
    console.log('📌 Baseline (Production) Deployment')
    console.log('═'.repeat(60))

    if (error) {
      console.log(`❌ Error: ${error.message || error}\n`)
      return
    }

    if (!baseline || !baseline.baseline) {
      console.log('⚠️  No active production deployment\n')
      return
    }

    const { deployment, metrics } = baseline.baseline

    console.log(`Version: ${deployment.version}`)
    console.log(`Status: ${deployment.status}`)
    console.log(`URL: ${deployment.url || 'N/A'}`)
    console.log(`Deployed: ${new Date(deployment.deployed_at).toLocaleString()}\n`)

    if (metrics) {
      console.log('📈 Metrics (Last 15 minutes):')
      console.log(`   Error Rate: ${(metrics.error_rate * 100).toFixed(3)}%`)
      console.log(`   P95 Latency: ${metrics.p95_latency.toFixed(0)}ms`)
      console.log(`   P99 Latency: ${metrics.p99_latency.toFixed(0)}ms`)
      console.log(`   Throughput: ${metrics.throughput.toFixed(0)} req/s`)
      console.log(`   Availability: ${metrics.availability.toFixed(2)}%`)
      console.log()
    }
  }

  /**
   * Display recommendation
   */
  private displayRecommendation(rec: Recommendation | null, error: any): void {
    console.log('🎯 DeployAI Recommendation')
    console.log('═'.repeat(60))

    if (error) {
      console.log(`❌ Error: ${error.message || error}\n`)
      return
    }

    if (!rec || !rec.recommendation) {
      console.log('⚠️  No recommendation available\n')
      return
    }

    const { action, confidence, risk_level, reasoning, metrics, slo_status, customer_impact } = rec.recommendation

    // Display action with emoji
    const actionEmoji = {
      promote: '✅',
      rollback: '🔄',
      monitor: '👀',
      extend_canary: '⏳'
    }

    const riskEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    }

    console.log(`${actionEmoji[action]} Recommended Action: ${action.toUpperCase()}`)
    console.log(`${riskEmoji[risk_level]} Risk Level: ${risk_level.toUpperCase()}`)
    console.log(`📊 Confidence: ${confidence.toUpperCase()}\n`)

    console.log('📋 Reasoning:')
    reasoning.forEach((reason, i) => {
      console.log(`   ${i + 1}. ${reason}`)
    })
    console.log()

    console.log('📈 Metrics:')
    console.log(`   Error Rate:`)
    console.log(`      Canary: ${(metrics.error_rate.canary * 100).toFixed(3)}%`)
    if (metrics.error_rate.baseline !== null) {
      console.log(`      Baseline: ${(metrics.error_rate.baseline * 100).toFixed(3)}%`)
    }
    console.log(`      Threshold: ${(metrics.error_rate.threshold * 100).toFixed(2)}%`)
    console.log()
    console.log(`   P95 Latency:`)
    console.log(`      Canary: ${metrics.p95_latency.canary.toFixed(0)}ms`)
    if (metrics.p95_latency.baseline !== null) {
      console.log(`      Baseline: ${metrics.p95_latency.baseline.toFixed(0)}ms`)
    }
    console.log(`      Threshold: ${metrics.p95_latency.threshold}ms`)
    console.log()
    console.log(`   P99 Latency:`)
    console.log(`      Canary: ${metrics.p99_latency.canary.toFixed(0)}ms`)
    if (metrics.p99_latency.baseline !== null) {
      console.log(`      Baseline: ${metrics.p99_latency.baseline.toFixed(0)}ms`)
    }
    console.log(`      Threshold: ${metrics.p99_latency.threshold}ms`)
    console.log()

    console.log('🎯 SLO Status:')
    console.log(`   Canary: ${slo_status.canary ? '✅ Meets SLO' : '❌ Violates SLO'}`)
    if (slo_status.baseline !== null) {
      console.log(`   Baseline: ${slo_status.baseline ? '✅ Meets SLO' : '❌ Violates SLO'}`)
    }
    console.log()

    console.log('👥 Customer Impact:')
    console.log(`   ${customer_impact}\n`)

    console.log('═'.repeat(60))
    console.log('⚠️  IMPORTANT: This is a recommendation only.')
    console.log('   DeployAI never performs deployments or rollbacks.')
    console.log('   Human review and approval required for all actions.\n')
  }
}

// Main execution
async function main() {
  const baseUrl = process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  const monitor = new DeployAIMonitor(baseUrl)
  await monitor.monitor()
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ DeployAI monitoring failed:', error)
    process.exit(1)
  })
}

export { DeployAIMonitor }
