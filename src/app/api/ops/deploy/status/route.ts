import { NextRequest, NextResponse } from 'next/server'
import { deployai } from '@/lib/observability/deployai'

/**
 * GET /ops/deploy/status
 * 
 * DeployAI - Current Deployment Status
 * 
 * Returns the current status of all deployments (canary, production, staging)
 */
export async function GET(request: NextRequest) {
  try {
    // Get deployment status with timeout
    const status = await Promise.race([
      deployai.getDeploymentStatus(),
      new Promise<Awaited<ReturnType<typeof deployai.getDeploymentStatus>>>((_, reject) =>
        setTimeout(() => reject(new Error('Deployment status query timeout')), 30000)
      )
    ]).catch((error) => {
      console.error('DeployAI status timeout or error:', error)
      throw error
    })

    return NextResponse.json({
      agent: 'DeployAI',
      timestamp: new Date().toISOString(),
      deployments: {
        canary: status.canary,
        production: status.production,
        staging: status.staging
      },
      summary: {
        has_canary: status.canary !== null,
        has_production: status.production !== null,
        has_staging: status.staging !== null,
        active_deployments: [
          status.canary,
          status.production,
          status.staging
        ].filter(Boolean).length
      }
    })
  } catch (error) {
    console.error('DeployAI status error:', error)
    return NextResponse.json(
      {
        agent: 'DeployAI',
        error: 'Failed to get deployment status',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
