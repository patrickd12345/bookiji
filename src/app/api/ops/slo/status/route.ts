import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sloai } from '@/lib/observability/sloai'

/**
 * GET /ops/slo/status
 * 
 * SLOAI Agent - Overall SLO Status Assessment
 * 
 * Evaluates whether Bookiji is inside or outside error budgets,
 * provides risk assessment, and explains customer impact.
 */
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client inside handler with safety checks
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          agent: 'SLOAI',
          error: 'Supabase not configured',
          status: 503,
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get overall status assessment with timeout
    const assessment = await Promise.race([
      sloai.assessOverallStatus(),
      new Promise<Awaited<ReturnType<typeof sloai.assessOverallStatus>>>((_, reject) =>
        setTimeout(() => reject(new Error('SLO assessment timeout')), 30000)
      )
    ]).catch((error) => {
      console.error('SLOAI assessment timeout or error:', error)
      throw error
    })

    // Get all SLO configs for context with timeout
    let sloConfigs: any = null
    try {
      const configResult = await Promise.race([
        supabase
          .from('slo_config')
          .select('*')
          .order('metric_name'),
        new Promise<{ data: null; error: { message: string } }>((_, reject) =>
          setTimeout(() => reject(new Error('Database query timeout')), 30000)
        )
      ])
      sloConfigs = (configResult as any).data
    } catch (error) {
      console.error('SLOAI config query timeout or error:', error)
      sloConfigs = null
    }

    // Get violation summary with timeout
    let violations: any = null
    try {
      const violationsResult = await Promise.race([
        supabase
          .from('slo_violations')
          .select('*')
          .is('resolved_at', null)
          .order('last_violation_at', { ascending: false }),
        new Promise<{ data: null; error: { message: string } }>((_, reject) =>
          setTimeout(() => reject(new Error('Database query timeout')), 30000)
        )
      ])
      violations = (violationsResult as any).data
    } catch (error) {
      console.error('SLOAI violations query timeout or error:', error)
      violations = null
    }

    const criticalCount = (violations || []).filter((v: any) => v.severity === 'critical').length
    const warningCount = (violations || []).filter((v: any) => v.severity === 'warning').length

    // Calculate compliance rate
    const totalConfigs = sloConfigs?.length || 0
    const compliantConfigs = totalConfigs - criticalCount - (warningCount > 0 ? 1 : 0)
    const complianceRate = totalConfigs > 0 ? (compliantConfigs / totalConfigs) * 100 : 100

    return NextResponse.json({
      agent: 'SLOAI',
      timestamp: new Date().toISOString(),
      status: {
        riskLevel: assessment.riskLevel,
        insideBudget: assessment.insideBudget,
        complianceRate: Math.round(complianceRate * 100) / 100,
        criticalViolations: criticalCount,
        warningViolations: warningCount,
        totalViolations: (violations || []).length
      },
      errorBudget: {
        total: Math.round(assessment.errorBudget.total * 100) / 100,
        consumed: Math.round(assessment.errorBudget.consumed * 100) / 100,
        remaining: Math.round(assessment.errorBudget.remaining * 100) / 100,
        burnRate: Math.round(assessment.errorBudget.burnRate * 100) / 100,
        timeToExhaustionHours: assessment.errorBudget.timeToExhaustion
          ? Math.round(assessment.errorBudget.timeToExhaustion * 100) / 100
          : null,
        riskLevel: assessment.errorBudget.riskLevel
      },
      customerImpact: assessment.customerImpact,
      humanAttentionNeeded: assessment.humanAttentionNeeded,
      recommendations: assessment.recommendations,
      sloConfigs: sloConfigs?.map((c: any) => ({
        metricName: c.metric_name,
        targetP95: c.target_p95_ms,
        targetP99: c.target_p99_ms,
        targetErrorRate: c.target_error_rate
      })) || [],
      interpretation: {
        summary: assessment.insideBudget
          ? `✅ Bookiji is within error budgets. Risk level: ${assessment.riskLevel}.`
          : `⚠️ Bookiji is outside error budgets. Risk level: ${assessment.riskLevel}.`,
        implications: assessment.customerImpact,
        actionRequired: assessment.humanAttentionNeeded
          ? 'Yes - Immediate attention recommended'
          : 'No - Continue monitoring'
      }
    })
  } catch (error) {
    console.error('SLOAI status assessment error:', error)
    return NextResponse.json(
      {
        agent: 'SLOAI',
        error: 'Failed to assess SLO status',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}