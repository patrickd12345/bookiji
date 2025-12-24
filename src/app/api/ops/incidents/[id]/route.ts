import { NextRequest, NextResponse } from 'next/server'
import { getOpsMode } from '../../_config'
import {
  fetchSimcitySnapshot,
  simcityToIncidents
} from '../../_simcity/ops-from-simcity'

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const { id } = await context.params
  if (getOpsMode() === 'simcity') {
    try {
      const { violations } = await fetchSimcitySnapshot(request.nextUrl.origin)
      const incidents = simcityToIncidents(violations)
      const incident = incidents.find((i) => i.id === id)

      if (!incident) {
        return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
      }

      return NextResponse.json(incident)
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Failed to load SimCity incident',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 503 }
      )
    }
  }

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

  const target = `${OPS_API_BASE.replace(/\/$/, '')}/ops/incidents/${id}`
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
