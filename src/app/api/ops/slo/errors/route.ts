import { NextRequest, NextResponse } from 'next/server'
import { sloai } from '@/lib/observability/sloai'
import { getServerSupabase } from '@/lib/supabaseServer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>

/**
 * GET /ops/slo/errors
 * 
 * SLOAI Agent - Error Rate SLO Assessment
 * 
 * Evaluates error rate SLO compliance, calculates burn rates,
 * and provides risk assessment for error metrics.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metricName = searchParams.get('metric') || 'api_booking' // Default to booking API

    // Get error metrics
    const metrics = await sloai.getErrorMetrics(metricName)

    // Calculate burn rate from violations
    const burnRate = sloai.calculateBurnRate(metrics.violations, 24) // Last 24 hours

    // Assess risk level
    const criticalViolations = metrics.violations.filter(v => v.severity === 'critical')
    const warningViolations = metrics.violations.filter(v => v.severity === 'warning')
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (criticalViolations.length > 0) {
      riskLevel = 'critical'
    } else if (warningViolations.length > 5) {
      riskLevel = 'high'
    } else if (warningViolations.length > 0) {
      riskLevel = 'medium'
    }

    // Check if inside SLO
    const insideSLO = metrics.errorRate <= metrics.targetErrorRate

    // Calculate error budget
    // Error budget = (1 - target_error_rate) * total_requests
    // For time-based budget, we use the target error rate as the SLO
    const sloTarget = 1 - metrics.targetErrorRate // e.g., 0.99 for 1% error rate target
    const errorBudget = sloai.calculateErrorBudget(sloTarget, 720) // 30 days
    errorBudget.consumed = metrics.errorCount
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
      'errors',
      metrics.errorRate * 100,
      metrics.targetErrorRate * 100
    )

    // Generate recommendations
    const recommendations = sloai.generateRecommendations(riskLevel, 'errors')

    // Calculate error rate percentage
    const errorRatePercent = metrics.errorRate * 100
    const targetErrorRatePercent = metrics.targetErrorRate * 100

    return NextResponse.json({
      agent: 'SLOAI',
      timestamp: new Date().toISOString(),
      metric: metricName,
      status: {
        riskLevel,
        insideSLO,
        violations: {
          critical: criticalViolations.length,
          warning: warningViolations.length,
          total: metrics.violations.length
        }
      },
      metrics: {
        current: {
          errorRate: Math.round(errorRatePercent * 10000) / 10000, // 4 decimal places
          errorRatePercent: Math.round(errorRatePercent * 100) / 100,
          errorCount: metrics.errorCount,
          totalRequests: metrics.totalRequests
        },
        target: {
          errorRate: metrics.targetErrorRate,
          errorRatePercent: Math.round(targetErrorRatePercent * 100) / 100
        },
        deviation: {
          absolute: Math.round((metrics.errorRate - metrics.targetErrorRate) * 10000) / 10000,
          percent: Math.round(((metrics.errorRate / metrics.targetErrorRate - 1) * 100) * 100) / 100
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
          ? `✅ Error rate SLO met. Current: ${Math.round(errorRatePercent * 100) / 100}% (target: ${Math.round(targetErrorRatePercent * 100) / 100}%)`
          : `⚠️ Error rate SLO violated. Current: ${Math.round(errorRatePercent * 100) / 100}% (target: ${Math.round(targetErrorRatePercent * 100) / 100}%)`,
        implications: customerImpact,
        burnRateAnalysis: burnRate > 0
          ? `Current burn rate: ${Math.round(burnRate * 100) / 100} violations/hour. ${errorBudget.timeToExhaustion ? `Budget will exhaust in ${Math.round(errorBudget.timeToExhaustion)} hours if current rate continues.` : 'Budget is stable.'}`
          : 'No active violations. Burn rate: 0 violations/hour.',
        requestAnalysis: `Out of ${metrics.totalRequests.toLocaleString()} requests, ${metrics.errorCount.toLocaleString()} resulted in errors.`
      }
    })
  } catch (error) {
    console.error('SLOAI error rate assessment error:', error)
    return NextResponse.json(
      {
        agent: 'SLOAI',
        error: 'Failed to assess error rate SLO',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}