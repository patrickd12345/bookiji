import { NextResponse } from 'next/server'
import { getOpenIncidents, loadIncidents } from '@/scripts/incidents-store'
import { getEventsByIncident } from '@/scripts/ops-events-store'
import type { Incident } from '@/types/incidents'

interface TriageSummary {
  incidentId: string
  title: string
  severity: string
  status: string
  summary: string
  signals: {
    type: string
    value: string | number
    threshold?: string | number
    source: string
  }[]
  recommendation: 'immediate' | 'urgent' | 'monitor' | 'low-priority'
  affectedServices?: string[]
  estimatedImpact?: string
}

interface IncidentsAITriageResponse {
  timestamp: string
  openIncidentsCount: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  summaries: TriageSummary[]
  recommendations: {
    immediate: string[]
    urgent: string[]
    monitor: string[]
  }
  context: {
    totalIncidents: number
    resolvedToday: number
    averageResolutionTime?: string
  }
}

/**
 * IncidentsAI - Incident manager and triage coordinator
 * 
 * Analyzes open incidents, their severity, and provides actionable triage summaries.
 * NEVER resolves or modifies incidents unless explicitly instructed.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeResolved = searchParams.get('includeResolved') === 'true'
    const lookbackHoursParam = searchParams.get('lookbackHours') || '24'
    const lookbackHours = parseInt(lookbackHoursParam, 10)

    // Validate lookbackHours
    if (isNaN(lookbackHours) || lookbackHours < 1 || lookbackHours > 168) {
      return NextResponse.json(
        { ok: false, error: 'Invalid lookbackHours parameter. Must be between 1 and 168 (hours)' },
        { status: 400 }
      )
    }
    
    // Get open incidents
    const openIncidents = getOpenIncidents()
    
    // Get all incidents for context if needed
    const allIncidents = includeResolved ? loadIncidents() : openIncidents
    
    // Calculate statistics
    const criticalCount = openIncidents.filter((i) => i.severity === 'critical').length
    const highCount = openIncidents.filter((i) => i.severity === 'high').length
    const mediumCount = openIncidents.filter((i) => i.severity === 'medium').length
    const lowCount = openIncidents.filter((i) => i.severity === 'low').length
    
    // Get resolved incidents from last 24 hours for context
    const lookbackTime = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString()
    const recentResolved = allIncidents.filter(
      (i) => i.status === 'resolved' && i.resolvedAt && i.resolvedAt >= lookbackTime
    )
    
    // Generate triage summaries for each open incident
    const summaries: TriageSummary[] = openIncidents.map((incident) => {
      // Get related events for context
      const relatedEvents = getEventsByIncident(incident.id)
      
      // Analyze signals to determine recommendation
      const recommendation = analyzeIncidentPriority(incident, relatedEvents.length)
      
      // Generate summary
      const summary = generateIncidentSummary(incident, relatedEvents.length)
      
      // Estimate impact
      const estimatedImpact = estimateImpact(incident)
      
      return {
        incidentId: incident.id,
        title: incident.title,
        severity: incident.severity,
        status: incident.status,
        summary,
        signals: incident.signals.map((s) => ({
          type: s.type,
          value: s.value,
          threshold: s.threshold,
          source: s.source
        })),
        recommendation,
        affectedServices: incident.affectedServices,
        estimatedImpact
      }
    })
    
    // Sort summaries by priority (immediate > urgent > monitor > low-priority)
    const priorityOrder: Record<string, number> = {
      immediate: 4,
      urgent: 3,
      monitor: 2,
      'low-priority': 1
    }
    summaries.sort((a, b) => 
      (priorityOrder[b.recommendation] || 0) - (priorityOrder[a.recommendation] || 0)
    )
    
    // Generate recommendations
    const recommendations = {
      immediate: summaries
        .filter((s) => s.recommendation === 'immediate')
        .map((s) => s.incidentId),
      urgent: summaries
        .filter((s) => s.recommendation === 'urgent')
        .map((s) => s.incidentId),
      monitor: summaries
        .filter((s) => s.recommendation === 'monitor')
        .map((s) => s.incidentId)
    }
    
    // Calculate average resolution time for context
    const resolvedWithTime = recentResolved.filter((i) => i.resolvedAt && i.createdAt)
    let averageResolutionTime: string | undefined
    if (resolvedWithTime.length > 0) {
      const totalMs = resolvedWithTime.reduce((sum, i) => {
        const created = new Date(i.createdAt).getTime()
        const resolved = new Date(i.resolvedAt!).getTime()
        return sum + (resolved - created)
      }, 0)
      const avgMs = totalMs / resolvedWithTime.length
      const hours = Math.floor(avgMs / (1000 * 60 * 60))
      const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60))
      averageResolutionTime = `${hours}h ${minutes}m`
    }
    
    const response: IncidentsAITriageResponse = {
      timestamp: new Date().toISOString(),
      openIncidentsCount: openIncidents.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      summaries,
      recommendations,
      context: {
        totalIncidents: allIncidents.length,
        resolvedToday: recentResolved.length,
        averageResolutionTime
      }
    }
    
    return NextResponse.json({
      ok: true,
      data: response
    })
  } catch (error) {
    console.error('Error generating triage summary:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to generate triage summary' },
      { status: 500 }
    )
  }
}

/**
 * Analyze incident priority based on severity, signals, and context
 */
function analyzeIncidentPriority(
  incident: Incident,
  relatedEventsCount: number
): TriageSummary['recommendation'] {
  // Critical severity always requires immediate attention
  if (incident.severity === 'critical') {
    return 'immediate'
  }
  
  // High severity with multiple signals or events is urgent
  if (incident.severity === 'high') {
    if (incident.signals.length > 2 || relatedEventsCount > 5) {
      return 'urgent'
    }
    return 'urgent'
  }
  
  // Medium severity with growing signals needs monitoring
  if (incident.severity === 'medium') {
    if (incident.signals.length > 3 || relatedEventsCount > 10) {
      return 'monitor'
    }
    return 'monitor'
  }
  
  // Low severity incidents are low priority
  return 'low-priority'
}

/**
 * Generate a concise summary of the incident
 */
function generateIncidentSummary(
  incident: Incident,
  relatedEventsCount: number
): string {
  const parts: string[] = []
  
  // Status and severity
  parts.push(`${incident.severity.toUpperCase()} severity incident`)
  
  // Signal count
  if (incident.signals.length > 0) {
    const signalTypes = [...new Set(incident.signals.map((s) => s.type))]
    parts.push(`detected via ${signalTypes.join(', ')}`)
  }
  
  // Event context
  if (relatedEventsCount > 0) {
    parts.push(`${relatedEventsCount} related events`)
  }
  
  // Affected services
  if (incident.affectedServices && incident.affectedServices.length > 0) {
    parts.push(`affecting ${incident.affectedServices.join(', ')}`)
  }
  
  // Impact
  if (incident.affectedUsers) {
    parts.push(`~${incident.affectedUsers} users impacted`)
  }
  
  return parts.join(' • ')
}

/**
 * Estimate impact based on incident data
 */
function estimateImpact(incident: Incident): string {
  if (incident.impact) {
    return incident.impact
  }
  
  const parts: string[] = []
  
  if (incident.affectedUsers) {
    if (incident.affectedUsers > 1000) {
      parts.push('High user impact')
    } else if (incident.affectedUsers > 100) {
      parts.push('Moderate user impact')
    } else {
      parts.push('Limited user impact')
    }
  }
  
  if (incident.affectedServices && incident.affectedServices.length > 0) {
    if (incident.affectedServices.length > 3) {
      parts.push('Multiple services affected')
    } else {
      parts.push(`${incident.affectedServices.length} service(s) affected`)
    }
  }
  
  if (parts.length === 0) {
    return 'Impact assessment pending'
  }
  
  return parts.join(' • ')
}

