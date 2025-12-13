import { NextRequest, NextResponse } from 'next/server'
import { sloai } from '@/lib/observability/sloai'
import { getServerSupabase } from '@/lib/supabaseServer'

const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>

/**
 * GET /ops/slo/availability
 * 
 * SLOAI Agent - Availability/Uptime SLO Assessment
 * 
 * Evaluates availability SLO compliance, calculates burn rates,
 * and provides risk assessment for uptime metrics.
 */
export async function GET(request: NextRequest) {
  try {
    // Get availability metrics
    const metrics = await sloai.getAvailabilityMetrics()

    // Calculate burn rate from violations
    const burnRate = sloai.calculateBurnRate(metrics.violations, 24) // Last 24 hours

    // Assess risk level
    const criticalViolations = metrics.violations.filter(v => v.severity === 'critical')
    const warningViolations = metrics.violations.filter(v => v.severity === 'warning')
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (criticalViolations.length > 0 || metrics.uptime < 99.0) {
      riskLevel = 'critical'
    } else if (metrics.uptime < 99.5) {
      riskLevel = 'high'
    } else if (metrics.uptime < metrics.targetUptime || warningViolations.length > 0) {
      riskLevel = 'medium'
    }

    // Check if inside SLO
    const insideSLO = metrics.uptime >= metrics.targetUptime

    // Calculate error budget for availability
    // For 99.9% uptime, error budget = 0.1% of time = 43.2 minutes per 30 days
    const sloTarget = metrics.targetUptime / 100 // Convert to decimal
    const errorBudget = sloai.calculateErrorBudget(sloTarget, 720) // 30 days
    errorBudget.consumed = metrics.downtimeMinutes
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
      'availability',
      metrics.uptime,
      metrics.targetUptime
    )

    // Generate recommendations
    const recommendations = sloai.generateRecommendations(riskLevel, 'availability')

    // Calculate availability deviation
    const deviation = metrics.uptime - metrics.targetUptime
    const budgetConsumedPercent = (errorBudget.consumed / errorBudget.total) * 100

    return NextResponse.json({
      agent: 'SLOAI',
      timestamp: new Date().toISOString(),
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
          uptime: Math.round(metrics.uptime * 100) / 100,
          uptimePercent: Math.round(metrics.uptime * 100) / 100,
          downtimeMinutes: Math.round(metrics.downtimeMinutes * 100) / 100,
          totalMinutes: metrics.totalMinutes
        },
        target: {
          uptime: metrics.targetUptime,
          uptimePercent: metrics.targetUptime
        },
        deviation: {
          absolute: Math.round(deviation * 100) / 100,
          percent: Math.round((deviation / metrics.targetUptime * 100) * 100) / 100
        }
      },
      errorBudget: {
        total: Math.round(errorBudget.total * 100) / 100,
        consumed: Math.round(errorBudget.consumed * 100) / 100,
        remaining: Math.round(errorBudget.remaining * 100) / 100,
        burnRate: Math.round(burnRate * 100) / 100,
        timeToExhaustionHours: errorBudget.timeToExhaustion
          ? Math.round(errorBudget.timeToExhaustion * 100) / 100
          : null,
        riskLevel: errorBudget.riskLevel,
        consumedPercent: Math.round(budgetConsumedPercent * 100) / 100
      },
      customerImpact,
      humanAttentionNeeded: riskLevel === 'critical' || riskLevel === 'high',
      recommendations,
      interpretation: {
        summary: insideSLO
          ? `✅ Availability SLO met. Uptime: ${Math.round(metrics.uptime * 100) / 100}% (target: ${metrics.targetUptime}%)`
          : `⚠️ Availability SLO violated. Uptime: ${Math.round(metrics.uptime * 100) / 100}% (target: ${metrics.targetUptime}%)`,
        implications: customerImpact,
        burnRateAnalysis: burnRate > 0
          ? `Current burn rate: ${Math.round(burnRate * 100) / 100} violations/hour. ${errorBudget.timeToExhaustion ? `Budget will exhaust in ${Math.round(errorBudget.timeToExhaustion)} hours if current rate continues.` : 'Budget is stable.'}`
          : 'No active violations. Burn rate: 0 violations/hour.',
        budgetAnalysis: `Error budget: ${Math.round(budgetConsumedPercent * 100) / 100}% consumed (${Math.round(errorBudget.consumed * 100) / 100} / ${Math.round(errorBudget.total * 100) / 100} minutes). ${errorBudget.remaining > 0 ? `${Math.round(errorBudget.remaining * 100) / 100} minutes remaining.` : 'Budget exhausted.'}`,
        downtimeAnalysis: `Downtime: ${Math.round(metrics.downtimeMinutes * 100) / 100} minutes out of ${metrics.totalMinutes} total minutes in the last 24 hours.`
      }
    })
  } catch (error) {
    console.error('SLOAI availability assessment error:', error)
    return NextResponse.json(
      {
        agent: 'SLOAI',
        error: 'Failed to assess availability SLO',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}