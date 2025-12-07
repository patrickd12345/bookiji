import { NextRequest, NextResponse } from 'next/server'
import { createEvent, getEventsByType, getEventsByTimeRange } from '../../../../../../scripts/ops-events-store'
import type { OpsEvent } from '@/types/opsEvents'

/**
 * GET /ops/events/deploy
 * 
 * List deployment events
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')
    const limit = parseInt(searchParams.get('limit') || '100')

    let events: OpsEvent[]

    if (startTime) {
      events = getEventsByTimeRange(startTime, endTime || undefined)
        .filter(e => e.type === 'deployment')
        .slice(0, limit)
    } else {
      events = getEventsByType('deployment').slice(0, limit)
    }

    // Sort by timestamp descending
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      success: true,
      events,
      count: events.length
    })

  } catch (error) {
    console.error('Deploy events GET endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /ops/events/deploy
 * 
 * Create a deployment event
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      deployId,
      commitSha,
      environment,
      service,
      status,
      duration,
      metadata
    } = body

    if (!deployId) {
      return NextResponse.json({
        success: false,
        error: 'deployId is required'
      }, { status: 400 })
    }

    const event = createEvent({
      type: 'deployment',
      severity: status === 'failed' ? 'error' : status === 'warning' ? 'warning' : 'info',
      title: `Deployment ${deployId}${status ? ` - ${status}` : ''}`,
      description: `Deployment event for ${service || 'system'}${environment ? ` in ${environment}` : ''}`,
      source: 'deployment',
      service: service || undefined,
      data: {
        deploy_id: deployId,
        commit_sha: commitSha,
        environment,
        status,
        duration,
        ...metadata
      },
      tags: ['deployment', environment, service].filter(Boolean) as string[]
    })

    return NextResponse.json({
      success: true,
      event
    })

  } catch (error) {
    console.error('Deploy events POST endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
