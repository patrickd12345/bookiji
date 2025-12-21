import { NextResponse } from 'next/server'
import { simCityStop } from '../../_lib/simcity'

export async function POST() {
  try {
    return NextResponse.json(simCityStop())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to stop SimCity'
    return NextResponse.json({ error: message }, { status: 403 })
  }
}

