import { NextRequest, NextResponse } from 'next/server'
import { sloai } from '@/lib/observability/sloai'
import { getServerSupabase } from '@/lib/supabaseClient'

const supabase = getServerSupabase()

/**
 * GET /ops/slo/latency
 * 
 * SLOAI Agent - Latency SLO Assessment
 * 
 * Evaluates latency SLO compliance, calculates burn rates,
 * and provides risk assessment for response time metrics.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metricName = searchParams.get('metric') || 'api_booking' // Default to booking API

    // Get latency metrics
    const metrics = await sloai.getLatencyMetrics(metricName)

    // Calculate burn rate from violations
    const burnRate = sloai.calculateBurnRate(metrics.violations, 24) // Last 24 hours

    // Assess risk level
    const p95Violations = metrics.violations.filter(v => v.violation_type === 'p95')
    const p99Violations = metrics.violations.filter(v => v.violation_type === 'p99')
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (p99Violations.some(v => v.severity === 'critical')) {
      riskLevel = 'critical'
    } else if (p95Violations.some(v => v.severity === 'critical')) {
      riskLevel = 'critical'
    } else if (p99Violations.some(v => v.severity === 'warning')) {
      riskLevel = 'high'
    } else if (p95Violations.some(v => v.severity === 'warning')) {
      riskLevel = 'medium'
    }

    // Check if inside SLO
    const insideP95SLO = metrics.currentP95 <= metrics.targetP95
    const insideP99SLO = metrics.currentP99 <= metrics.targetP99
    const insideSLO = insideP95SLO && insideP99SLO

    // Calculate error budget for latency (using P95 target)
    // For latency, we consider violations as "errors" in the budget
    const errorBudget = sloai.calculateErrorBudget(0.95, 720) // 95% target over 30 days
    errorBudget.consumed = p95Violations.length + p99Violations.length
    errorBudget.remaining = Math.max(0, errorBudget.total - errorBudget.consumed)
    errorBudget.burnRate = burnRate
    errorBudget.timeToExhaustion = sloai.calculateTimeToExhaustion(
      errorBudget.remaining,
      burnRate
    )
    errorBudget.riskLevel = sloai.assessRiskLevel(errorBudget, errorBudget.timeToExhaustion)

    // Generate customer impact
    const customerImpact = sloai.generateCustomerImpact(
      riskLevel,
      'latency',
      metrics.currentP95,
      metrics.targetP95
    )

    // Generate recommendations
    const recommendations = sloai.generateRecommendations(riskLevel, 'latency')

    return NextResponse.json({
      agent: 'SLOAI',
      timestamp: new Date().toISOString(),
      metric: metricName,
      status: {
        riskLevel,
        insideSLO,
        insideP95SLO,
        insideP99SLO,
        violations: {
          p95: p95Violations.length,
          p99: p99Violations.length,
          total: metrics.violations.length
        }
      },
      metrics: {
        current: {
          p50: Math.round(metrics.p50),
          p95: Math.round(metrics.currentP95),
          p99: Math.round(metrics.currentP99)
        },
        targets: {
          p95: metrics.targetP95,
          p99: metrics.targetP99
        },
        deviation: {
          p95: Math.round((metrics.currentP95 / metrics.targetP95 - 1) * 100),
          p99: Math.round((metrics.currentP99 / metrics.targetP99 - 1) * 100)
        }
      },
      errorBudget: {
        total: Math.round(errorBudget.total * 100) / 100,
        consumed: errorBudget.consumed,
        remaining: Math.round(errorBudget.remaining * 100) / 100,
        burnRate: Math.round(burnRate * 100) / 100,
        timeToExhaustionHours: errorBudget.timeToExhaustion
          ? Math.round(errorBudget.timeToExhaustion * 100) / 100
          : null,
        riskLevel: errorBudget.riskLevel
      },
      customerImpact,
      humanAttentionNeeded: riskLevel === 'critical' || riskLevel === 'high',
      recommendations,
      interpretation: {
        summary: insideSLO
          ? `✅ Latency SLO met. P95: ${Math.round(metrics.currentP95)}ms (target: ${metrics.targetP95}ms), P99: ${Math.round(metrics.currentP99)}ms (target: ${metrics.targetP99}ms)`
          : `⚠️ Latency SLO violated. P95: ${Math.round(metrics.currentP95)}ms (target: ${metrics.targetP95}ms), P99: ${Math.round(metrics.currentP99)}ms (target: ${metrics.targetP99}ms)`,
        implications: customerImpact,
        burnRateAnalysis: burnRate > 0
          ? `Current burn rate: ${Math.round(burnRate * 100) / 100} violations/hour. ${errorBudget.timeToExhaustion ? `Budget will exhaust in ${Math.round(errorBudget.timeToExhaustion)} hours if current rate continues.` : 'Budget is stable.'}`
          : 'No active violations. Burn rate: 0 violations/hour.'
      }
    })
  } catch (error) {
    console.error('SLOAI latency assessment error:', error)
    return NextResponse.json(
      {
        agent: 'SLOAI',
        error: 'Failed to assess latency SLO',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}