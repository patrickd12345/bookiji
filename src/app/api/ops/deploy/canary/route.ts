import { NextRequest, NextResponse } from 'next/server'
import { deployai } from '@/lib/observability/deployai'

/**
 * GET /ops/deploy/canary
 * 
 * DeployAI - Canary Deployment Information
 * 
 * Returns detailed information about the current canary deployment,
 * including metrics and comparison with baseline
 */
export async function GET(request: NextRequest) {
  try {
    const canary = await deployai.getCanaryDeployment()
    
    if (!canary) {
      return NextResponse.json({
        agent: 'DeployAI',
        timestamp: new Date().toISOString(),
        canary: null,
        message: 'No active canary deployment found'
      })
    }

    const metrics = await deployai.getDeploymentMetrics(canary.id)
    const comparison = await deployai.compareCanaryBaseline()

    return NextResponse.json({
      agent: 'DeployAI',
      timestamp: new Date().toISOString(),
      canary: {
        deployment: canary,
        metrics: metrics || null,
        comparison: comparison ? {
          vs_baseline: {
            error_rate_diff: comparison.comparison.error_rate_diff,
            p95_latency_diff: comparison.comparison.p95_latency_diff,
            p99_latency_diff: comparison.comparison.p99_latency_diff,
            throughput_diff: comparison.comparison.throughput_diff,
            availability_diff: comparison.comparison.availability_diff
          },
          slo_alignment: comparison.slo_alignment
        } : null
      }
    })
  } catch (error) {
    console.error('DeployAI canary error:', error)
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
