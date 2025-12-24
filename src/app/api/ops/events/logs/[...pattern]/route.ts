import { NextResponse } from 'next/server'
import { aggregateLogs } from '@/scripts/logs-store'
import {
  detectPatterns,
  correlateWithDeployments,
  getTopErrors,
  generateInsights
} from '@/scripts/logs-analyzer'
import { loadPatterns } from '@/scripts/logs-store'
import { loadEvents } from '@/scripts/ops-events-store'
import type { LogAnalysis } from '@/types/logs'

/**
 * LogsAI - Pattern-based event log analyzer
 * 
 * Analyzes logs matching a specific pattern or filter.
 * Output style: Analytical, pattern-focused, correlational (not causal unless clear).
 * 
 * Route: /api/ops/events/logs/[pattern]
 * 
 * Query parameters:
 * - pattern: Pattern to match (optional, if not in path)
 * - startTime: ISO timestamp for start of time range
 * - endTime: ISO timestamp for end of time range
 * - lookbackHours: Hours to look back (default: 24)
 * - source: Filter by source
 * - service: Filter by service
 * - severity: Filter by severity
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ pattern: string[] }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const patternParam = (await context.params).pattern
    const patternFromPath = Array.isArray(patternParam) ? patternParam.join('/') : (patternParam || '')
    const patternFromQuery = searchParams.get('pattern')
    const pattern = patternFromPath || patternFromQuery || ''
    
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')
    const lookbackHoursParam = searchParams.get('lookbackHours') || '24'
    const lookbackHours = parseInt(lookbackHoursParam, 10)

    // Validate lookbackHours
    if (isNaN(lookbackHours) || lookbackHours < 1 || lookbackHours > 168) {
      return NextResponse.json(
        { ok: false, error: 'Invalid lookbackHours parameter. Must be between 1 and 168 (hours)' },
        { status: 400 }
      )
    }

    // Validate time range if provided
    if (startTime) {
      const startDate = new Date(startTime)
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { ok: false, error: 'Invalid startTime format. Use ISO 8601 format.' },
          { status: 400 }
        )
      }
    }

    if (endTime) {
      const endDate = new Date(endTime)
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { ok: false, error: 'Invalid endTime format. Use ISO 8601 format.' },
          { status: 400 }
        )
      }
    }
    const source = searchParams.get('source')
    const service = searchParams.get('service')
    const severity = searchParams.get('severity')
    
    // Calculate time range
    const end = endTime ? new Date(endTime) : new Date()
    const start = startTime 
      ? new Date(startTime)
      : new Date(end.getTime() - lookbackHours * 60 * 60 * 1000)
    
    // Get all logs
    let logs = aggregateLogs(start.toISOString(), end.toISOString())
    
    // Filter by pattern if provided
    if (pattern) {
      const patternRegex = new RegExp(pattern, 'i')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logs = logs.filter((log: any) => 
        patternRegex.test(log.message) ||
        patternRegex.test(log.source) ||
        (log.service && patternRegex.test(log.service))
      )
    }
    
    // Filter by source
    if (source) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logs = logs.filter((log: any) => log.source === source)
    }
    
    // Filter by service
    if (service) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logs = logs.filter((log: any) => log.service === service)
    }
    
    // Filter by severity
    if (severity) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logs = logs.filter((log: any) => log.severity === severity)
    }
    
    // Load existing patterns
    const existingPatterns = loadPatterns()
    
    // Detect patterns
    const detectedPatterns = detectPatterns(logs, existingPatterns)
    
    // Correlate with deployments
    const events = loadEvents()
    const correlations = correlateWithDeployments(logs, events)
    
    // Get top errors
    const topErrors = getTopErrors(logs)
    
    // Generate insights
    const insights = generateInsights(logs, detectedPatterns, correlations)
    
    // Calculate statistics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorCount = logs.filter((l: any) => l.severity === 'error').length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const criticalCount = logs.filter((l: any) => l.severity === 'critical').length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const warningCount = logs.filter((l: any) => l.severity === 'warning').length
    
    const analysis: LogAnalysis = {
      timestamp: new Date().toISOString(),
      category: 'event',
      timeRange: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      totalLogs: logs.length,
      errorCount,
      warningCount,
      criticalCount,
      newPatterns: detectedPatterns.newPatterns,
      recurringPatterns: detectedPatterns.recurringPatterns,
      regressions: detectedPatterns.regressions,
      deploymentCorrelations: correlations,
      topErrors: topErrors.slice(0, 10),
      insights
    }
    
    return NextResponse.json({
      ok: true,
      data: analysis,
      filters: {
        pattern: pattern || undefined,
        source: source || undefined,
        service: service || undefined,
        severity: severity || undefined
      }
    })
  } catch (error) {
    console.error('Error analyzing event logs:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to analyze event logs' },
      { status: 500 }
    )
  }
}
