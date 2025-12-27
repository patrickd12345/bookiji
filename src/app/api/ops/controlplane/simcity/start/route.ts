import { NextRequest, NextResponse } from 'next/server'
import { simCityStart } from '../../_lib/simcity'
import { assertSimCityAllowed } from '@/lib/env/operationalInvariants'

export async function POST(request: NextRequest) {
  // Enforce environment isolation: SimCity forbidden in production
  try {
    assertSimCityAllowed();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SimCity is not allowed'
    return NextResponse.json({ error: message }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  try {
    const status = simCityStart({
      seed: body?.seed ?? 1,
      tickRateMs: body?.tickRateMs ?? 1000,
      latency: body?.latency,
      failureProbabilityByDomain: body?.failureProbabilityByDomain,
      scenarios: body?.scenarios,
      enabledDomains: body?.enabledDomains,
      domains: body?.domains,
      proposals: body?.proposals,
    })
    return NextResponse.json(status)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start SimCity'
    return NextResponse.json({ error: message }, { status: 403 })
  }
}
