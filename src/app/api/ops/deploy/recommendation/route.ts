import { NextRequest, NextResponse } from 'next/server'
import { deployai } from '@/lib/observability/deployai'

/**
 * GET /ops/deploy/recommendation
 * 
 * DeployAI - Deployment Recommendation
 * 
 * Analyzes canary vs baseline performance and provides evidence-based
 * recommendation: promote, rollback, monitor, or extend_canary.
 * 
 * NEVER performs the action - only recommends.
 */
export async function GET(request: NextRequest) {
  try {
    const recommendation = await deployai.generateRecommendation()

    return NextResponse.json({
      agent: 'DeployAI',
      timestamp: new Date().toISOString(),
      recommendation: {
        action: recommendation.action,
        confidence: recommendation.confidence,
        risk_level: recommendation.risk_level,
        reasoning: recommendation.reasoning,
        metrics: recommendation.metrics,
        slo_status: recommendation.slo_status,
        customer_impact: recommendation.customer_impact
      },
      note: 'This is a recommendation only. DeployAI never performs deployments or rollbacks.'
    })
  } catch (error) {
    console.error('DeployAI recommendation error:', error)
    return NextResponse.json(
      {
        agent: 'DeployAI',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
