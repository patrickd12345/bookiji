import { NextResponse } from 'next/server'
import { getIncident } from '@/scripts/incidents-store'

export async function GET(
  request: Request,
  context: { params: Promise<Record<string, string>> }
) {
  const { id } = await context.params
  try {
    const incident = getIncident(id)
    
    if (!incident) {
      return NextResponse.json(
        { ok: false, error: 'Incident not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      ok: true,
      data: incident
    })
  } catch (error) {
    console.error('Error getting incident:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to get incident' },
      { status: 500 }
    )
  }
}

