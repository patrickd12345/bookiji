import { NextRequest, NextResponse } from 'next/server'
import { simCityCursor, simCityGetEvents } from '../../_lib/simcity'

function parseOptionalInt(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const sinceTick = parseOptionalInt(url.searchParams.get('sinceTick'))
  const limit = parseOptionalInt(url.searchParams.get('limit'))
  const domain = url.searchParams.get('domain') ?? undefined

  try {
    const events = simCityGetEvents({ sinceTick, limit, domain })
    const cursor = simCityCursor()
    return NextResponse.json({
      success: true,
      seed: cursor.seed,
      tick: cursor.tick,
      events: events.map((envelope) => envelope.event),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read SimCity events'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }
}
