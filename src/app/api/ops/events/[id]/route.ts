import { NextResponse } from 'next/server'
import { getEvent } from '@/scripts/ops-events-store'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const event = getEvent(params.id)
    
    if (!event) {
      return NextResponse.json(
        { ok: false, error: 'Event not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      ok: true,
      data: event
    })
  } catch (error) {
    console.error('Error getting event:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to get event' },
      { status: 500 }
    )
  }
}

