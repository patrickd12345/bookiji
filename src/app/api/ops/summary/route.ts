import { NextRequest, NextResponse } from 'next/server'
import { getOpsMode } from '../_config'
import { fetchSimcitySnapshot, simcityToOpsSummary } from '../_simcity/ops-from-simcity'

function emptyDeploymentsSummary() {
  const timestamp = new Date().toISOString()
  return {
    timestamp,
    health: {
      overall: 'unknown',
      services: []
    },
    sloSummary: [],
    incidents: [],
    pendingActions: [],
    deployments: [],
    message: 'No recent deployments detected'
  }
}

export async function GET(request: NextRequest) {
  const forceEmptyDeployments =
    request.nextUrl.searchParams.get('forceEmptyDeployments') === '1'

  // CI / simulation hook: bypass upstream systems and return a safe,
  // schema-valid summary with an empty deployments array.
  if (forceEmptyDeployments) {
    return NextResponse.json(emptyDeploymentsSummary())
  }

  if (getOpsMode() === 'simcity') {
    try {
      const { state, runInfo, violations } = await fetchSimcitySnapshot(
        request.nextUrl.origin
      )
      return NextResponse.json(simcityToOpsSummary(state, runInfo, violations))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      // If SimCity is not running or deployment not found, return a graceful fallback
      if (errorMessage.includes('not found') || errorMessage.includes('not running')) {
        return NextResponse.json({
          timestamp: new Date().toISOString(),
          health: {
            overall: 'unknown',
            services: []
          },
          sloSummary: [],
          incidents: [],
          pendingActions: [],
          message: 'SimCity is not running. Start a simulation to view ops summary.'
        })
      }
      return NextResponse.json(
        {
          error: 'Failed to load SimCity summary',
          message: errorMessage
        },
        { status: 503 }
      )
    }
  }

  // Resolve base URL: prefer env vars, fall back to request origin for local dev
  const OPS_API_BASE =
    process.env.OPS_API_BASE ||
    process.env.NEXT_PUBLIC_OPS_BASE ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    request.nextUrl.origin ||
    null

  if (!OPS_API_BASE) {
    return NextResponse.json(
      { error: 'OPS_API_BASE not configured and cannot determine base URL' },
      { status: 503 }
    )
  }

  const target = `${OPS_API_BASE.replace(/\/$/, '')}/ops/summary`
  try {
    const res = await fetch(target, { cache: 'no-store' })
    const raw = await res.text()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any
    try {
      data = JSON.parse(raw)
    } catch {
      data = raw
    }
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch from Ops Fabric',
        message: error instanceof Error ? error.message : 'Unknown error',
        target
      },
      { status: 503 }
    )
  }
}
