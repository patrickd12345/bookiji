import { NextResponse } from 'next/server'
import { loadIncidents, getOpenIncidents } from '@/scripts/incidents-store'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const openOnly = searchParams.get('openOnly') === 'true'
    
    let incidents = openOnly ? getOpenIncidents() : loadIncidents()
    
    // Filter by status if provided
    if (status) {
      incidents = incidents.filter((i) => i.status === status)
    }
    
    // Filter by severity if provided
    if (severity) {
      incidents = incidents.filter((i) => i.severity === severity)
    }
    
    // Sort by severity (critical > high > medium > low) then by createdAt (newest first)
    const severityOrder: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1
    }
    
    incidents.sort((a, b) => {
      const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0)
      if (severityDiff !== 0) return severityDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    
    return NextResponse.json({
      ok: true,
      data: incidents,
      count: incidents.length
    })
  } catch (error) {
    console.error('Error listing incidents:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to list incidents' },
      { status: 500 }
    )
  }
}



