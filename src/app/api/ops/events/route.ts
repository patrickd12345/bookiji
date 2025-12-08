import { NextResponse } from 'next/server'
import {
  loadEvents,
  getEventsByIncident,
  getEventsByTimeRange,
  getEventsByType,
  getEventsBySeverity
} from '@/scripts/ops-events-store'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const incidentId = searchParams.get('incidentId')
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')
    const type = searchParams.get('type')
    const severity = searchParams.get('severity')
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    
    let events = loadEvents()
    
    // Filter by incident ID if provided
    if (incidentId) {
      events = getEventsByIncident(incidentId)
    }
    
    // Filter by time range if provided
    if (startTime) {
      events = getEventsByTimeRange(startTime, endTime || undefined)
    }
    
    // Filter by type if provided
    if (type) {
      events = events.filter((e) => e.type === type)
    }
    
    // Filter by severity if provided
    if (severity) {
      events = events.filter((e) => e.severity === severity)
    }
    
    // Sort by timestamp (newest first)
    events.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    
    // Apply limit
    events = events.slice(0, limit)
    
    return NextResponse.json({
      ok: true,
      data: events,
      count: events.length
    })
  } catch (error) {
    console.error('Error listing events:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to list events' },
      { status: 500 }
    )
  }
}




