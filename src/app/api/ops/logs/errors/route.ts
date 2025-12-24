import { NextResponse } from 'next/server'
import { getOpsMode } from '../../_config'
import {
  fetchSimcitySnapshot,
  simcityToLogs
} from '../../_simcity/ops-from-simcity'
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
 * LogsAI - Error log pattern detector and anomaly explainer
 * 
 * Analyzes error logs to detect patterns, regressions, and correlations.
 * Output style: Analytical, pattern-focused, correlational (not causal unless clear).
 */
export async function GET(request: Request) {
  if (getOpsMode() === 'simcity') {
    try {
      const origin = new URL(request.url).origin
      const { violations } = await fetchSimcitySnapshot(origin)
      return NextResponse.json(simcityToLogs(violations))
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Failed to load SimCity logs',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 503 }
      )
    }
  }

  try {
    const { searchParams } = new URL(request.url)
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
    
    // Calculate time range
    const end = endTime ? new Date(endTime) : new Date()
    const start = startTime 
      ? new Date(startTime)
      : new Date(end.getTime() - lookbackHours * 60 * 60 * 1000)

    // Validate time range is not in the future
    if (end > new Date()) {
      return NextResponse.json(
        { ok: false, error: 'endTime cannot be in the future' },
        { status: 400 }
      )
    }

    // Validate start is before end
    if (start >= end) {
      return NextResponse.json(
        { ok: false, error: 'startTime must be before endTime' },
        { status: 400 }
      )
    }
    
    // Get error logs
    const allLogs = aggregateLogs(start.toISOString(), end.toISOString())
    const errorLogs = allLogs.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (log: any) => log.category === 'error' || 
               (log.severity === 'error' || log.severity === 'critical')
    )
    
    // Load existing patterns
    const existingPatterns = loadPatterns()
    
    // Detect patterns
    const patterns = detectPatterns(errorLogs, existingPatterns)
    
    // Correlate with deployments
    const events = loadEvents()
    const correlations = correlateWithDeployments(errorLogs, events)
    
    // Get top errors
    const topErrors = getTopErrors(errorLogs)
    
    // Generate insights
    const insights = generateInsights(errorLogs, patterns, correlations)
    
    // Calculate statistics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorCount = errorLogs.filter((l: any) => l.severity === 'error').length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const criticalCount = errorLogs.filter((l: any) => l.severity === 'critical').length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const warningCount = errorLogs.filter((l: any) => l.severity === 'warning').length
    
    const analysis: LogAnalysis = {
      timestamp: new Date().toISOString(),
      category: 'error',
      timeRange: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      totalLogs: errorLogs.length,
      errorCount,
      warningCount,
      criticalCount,
      newPatterns: patterns.newPatterns,
      recurringPatterns: patterns.recurringPatterns,
      regressions: patterns.regressions,
      deploymentCorrelations: correlations,
      topErrors: topErrors.slice(0, 10),
      insights
    }
    
    return NextResponse.json({
      ok: true,
      data: analysis
    })
  } catch (error) {
    console.error('Error analyzing error logs:', error)
    return NextResponse.json(
      {
        agent: 'LogsAI',
        ok: false,
        error: 'Failed to analyze error logs',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
