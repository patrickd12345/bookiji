import { NextRequest, NextResponse } from 'next/server'
import { deployai } from '@/lib/observability/deployai'

/**
 * GET /ops/deploy/baseline
 * 
 * DeployAI - Baseline (Production) Deployment Information
 * 
 * Returns detailed information about the current production/baseline deployment,
 * including metrics
 */
export async function GET(request: NextRequest) {
  try {
    const baseline = await deployai.getBaselineDeployment()
    
    if (!baseline) {
      return NextResponse.json({
        agent: 'DeployAI',
        timestamp: new Date().toISOString(),
        baseline: null,
        message: 'No active production deployment found'
      })
    }

    const metrics = await deployai.getDeploymentMetrics(baseline.id)

    return NextResponse.json({
      agent: 'DeployAI',
      timestamp: new Date().toISOString(),
      baseline: {
        deployment: baseline,
        metrics: metrics || null
      }
    })
  } catch (error) {
    console.error('DeployAI baseline error:', error)
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
