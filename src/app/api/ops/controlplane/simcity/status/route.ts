import { NextResponse } from 'next/server'
import { simCityStatus } from '../../_lib/simcity'

export async function GET() {
  try {
    return NextResponse.json(simCityStatus())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read SimCity status'
    return NextResponse.json({ error: message }, { status: 403 })
  }
}

