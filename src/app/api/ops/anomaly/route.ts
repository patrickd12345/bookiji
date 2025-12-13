import { NextRequest, NextResponse } from 'next/server'
import { AnomalyAI, AnomalySignal } from '@/lib/observability/anomalyai'

/**
 * GET /api/ops/anomaly
 * 
 * AnomalyAI - Cross-domain anomaly detection specialist
 * 
 * Monitors all read-only endpoints (health, metrics, SLO, incidents, events, logs)
 * and generates unified anomaly reports with severity prioritization
 * and agent recommendations.
 * 
 * Query Parameters:
 * - baseUrl (optional): Base URL for endpoints
 * - lookbackMinutes (optional): Time window for analysis (default: 15)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Base URL resolution: prefer request.nextUrl.origin -> env -> explicit param
    // In serverless, NEXT_PUBLIC_SITE_URL is required
    let baseUrl = searchParams.get('baseUrl')
    
    if (!baseUrl) {
      // Prefer request.nextUrl.origin when available (works in most environments)
      baseUrl = request.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || null
    }

    // Validate baseUrl - must be a valid URL
    if (!baseUrl) {
      return NextResponse.json(
        {
          agent: 'AnomalyAI',
          error: 'Base URL cannot be determined',
          message: 'NEXT_PUBLIC_SITE_URL environment variable is required in serverless environments',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }

    // Validate URL format
    try {
      new URL(baseUrl)
    } catch {
      return NextResponse.json(
        {
          agent: 'AnomalyAI',
          error: 'Invalid base URL format',
          message: `Base URL "${baseUrl}" is not a valid URL`,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    const allSignals: AnomalySignal[] = []

    // Define all endpoints to probe
    const endpoints = [
      { 
        name: 'health',
        url: `${baseUrl}/api/ops/health`, 
        handler: handleHealth,
        source: 'health'
      },
      { 
        name: 'metrics.system',
        url: `${baseUrl}/api/ops/metrics/system?timeRange=1h`, 
        handler: handleMetricsSystem,
        source: 'metrics.system'
      },
      { 
        name: 'metrics.errors',
        url: `${baseUrl}/api/ops/metrics/errors?timeRange=1h`, 
        handler: handleMetricsErrors,
        source: 'metrics.errors'
      },
      { 
        name: 'metrics.p95',
        url: `${baseUrl}/api/ops/metrics/p95?timeRange=1h`, 
        handler: handleMetricsP95,
        source: 'metrics.p95'
      },
      { 
        name: 'slo',
        url: `${baseUrl}/api/ops/slo/status`, 
        handler: handleSLO,
        source: 'slo'
      },
      { 
        name: 'incidents',
        url: `${baseUrl}/api/ops/incidents/ai-triage`, 
        handler: handleIncidents,
        source: 'incidents'
      },
      { 
        name: 'logs.errors',
        url: `${baseUrl}/api/ops/logs/errors?lookbackHours=1`, 
        handler: handleLogsErrors,
        source: 'logs.errors'
      },
      { 
        name: 'logs.system',
        url: `${baseUrl}/api/ops/logs/system?lookbackHours=1`, 
        handler: handleLogsSystem,
        source: 'logs.system'
      },
      { 
        name: 'logs.booking',
        url: `${baseUrl}/api/ops/logs/booking?lookbackHours=1`, 
        handler: handleLogsBooking,
        source: 'logs.booking'
      },
      { 
        name: 'events',
        url: `${baseUrl}/api/ops/events?limit=100`, 
        handler: handleEvents,
        source: 'events'
      },
    ]

    // Probe all endpoints in parallel with individual error handling
    const results = await Promise.allSettled(
      endpoints.map(async ({ url, handler, name, source }) => {
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'AnomalyAI/1.0'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout per endpoint
          })

          if (!response.ok) {
            console.warn(`AnomalyAI: ${name} returned ${response.status}`)
            // Return missing signal instead of null
            return {
              signals: [],
              missing: {
                source,
                status: 'missing',
                reason: `endpoint returned ${response.status}`,
                endpoint: name
              }
            }
          }

          const data = await response.json()
          const signals = handler(data, url)
          return { signals, missing: null }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.warn(`AnomalyAI: Failed to fetch ${name}:`, errorMessage)
          
          // Return missing signal instead of null
          return {
            signals: [],
            missing: {
              source,
              status: 'missing',
              reason: errorMessage.includes('timeout') || errorMessage.includes('AbortError')
                ? 'endpoint timeout'
                : errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')
                ? 'endpoint unreachable'
                : 'endpoint error',
              endpoint: name
            }
          }
        }
      })
    )

    // Collect all signals and track missing endpoints
    const missingEndpoints: Array<{ source: string; status: string; reason: string; endpoint: string }> = []
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { signals, missing } = result.value
        if (signals && signals.length > 0) {
          allSignals.push(...signals)
        }
        if (missing) {
          missingEndpoints.push(missing)
          // Add a signal indicating missing data
          allSignals.push({
            source: missing.source as AnomalySignal['source'],
            endpoint: missing.endpoint,
            type: 'endpoint_unavailable',
            severity: 'low' as const,
            description: `Endpoint ${missing.endpoint} unavailable: ${missing.reason}`,
            timestamp: new Date().toISOString(),
            metadata: { endpoint: missing.endpoint, reason: missing.reason }
          })
        }
      } else {
        // Promise rejected (shouldn't happen with Promise.allSettled, but handle it)
        console.error('AnomalyAI: Unexpected promise rejection:', result.reason)
      }
    }

    // Unify anomalies (works even with partial data)
    const unifiedAnomalies = AnomalyAI.unifyAnomalies(allSignals)

    // Generate report
    const report = AnomalyAI.generateReport(unifiedAnomalies)

    return NextResponse.json({
      agent: 'AnomalyAI',
      timestamp: new Date().toISOString(),
      report,
      rawSignalsCount: allSignals.length,
      unifiedAnomaliesCount: unifiedAnomalies.length,
      endpointsProbed: endpoints.length,
      endpointsAvailable: endpoints.length - missingEndpoints.length,
      missingEndpoints: missingEndpoints.length > 0 ? missingEndpoints : undefined
    })

  } catch (error) {
    console.error('AnomalyAI error:', error)
    return NextResponse.json(
      {
        agent: 'AnomalyAI',
        error: 'Failed to generate anomaly report',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Handle health endpoint data
 */
function handleHealth(data: any): AnomalySignal[] {
  return AnomalyAI.detectHealthAnomalies(data)
}

/**
 * Handle system metrics endpoint data
 */
function handleMetricsSystem(data: any, endpoint: string): AnomalySignal[] {
  return AnomalyAI.detectMetricsAnomalies(data, endpoint)
}

/**
 * Handle error metrics endpoint data
 */
function handleMetricsErrors(data: any, endpoint: string): AnomalySignal[] {
  return AnomalyAI.detectMetricsAnomalies(data, endpoint)
}

/**
 * Handle P95 metrics endpoint data
 */
function handleMetricsP95(data: any, endpoint: string): AnomalySignal[] {
  return AnomalyAI.detectMetricsAnomalies(data, endpoint)
}

/**
 * Handle SLO endpoint data
 */
function handleSLO(data: any): AnomalySignal[] {
  return AnomalyAI.detectSLOAnomalies(data)
}

/**
 * Handle incidents endpoint data
 */
function handleIncidents(data: any): AnomalySignal[] {
  return AnomalyAI.detectIncidentAnomalies(data)
}

/**
 * Handle error logs endpoint data
 */
function handleLogsErrors(data: any, endpoint: string): AnomalySignal[] {
  return AnomalyAI.detectLogAnomalies(data, endpoint)
}

/**
 * Handle system logs endpoint data
 */
function handleLogsSystem(data: any, endpoint: string): AnomalySignal[] {
  return AnomalyAI.detectLogAnomalies(data, endpoint)
}

/**
 * Handle booking logs endpoint data
 */
function handleLogsBooking(data: any, endpoint: string): AnomalySignal[] {
  return AnomalyAI.detectLogAnomalies(data, endpoint)
}

/**
 * Handle events endpoint data
 */
function handleEvents(data: any, endpoint: string): AnomalySignal[] {
  return AnomalyAI.detectEventAnomalies(data, endpoint)
}
