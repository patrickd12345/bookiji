/**
 * Calendar Sync Metrics Export Endpoint
 * 
 * Exposes calendar sync metrics for external monitoring systems.
 * Supports JSON and Prometheus-compatible formats.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAllMetrics } from '@/lib/calendar-sync/observability/metrics'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    const metrics = getAllMetrics()

    if (format === 'prometheus') {
      // Prometheus-compatible format
      const lines: string[] = []
      
      // Export counters
      for (const [name, value] of Object.entries(metrics.counters)) {
        lines.push(`# TYPE ${name} counter`)
        lines.push(`${name} ${value}`)
      }
      
      // Export histograms
      for (const [name, histogram] of Object.entries(metrics.histograms)) {
        const { count, sum, min, max } = histogram
        
        lines.push(`# TYPE ${name}_count counter`)
        lines.push(`${name}_count ${count}`)
        
        lines.push(`# TYPE ${name}_sum counter`)
        lines.push(`${name}_sum ${sum}`)
        
        lines.push(`# TYPE ${name}_min gauge`)
        lines.push(`${name}_min ${min}`)
        
        lines.push(`# TYPE ${name}_max gauge`)
        lines.push(`${name}_max ${max}`)
        
        // Calculate percentiles if we have values
        if (histogram.values.length > 0) {
          const sorted = [...histogram.values].sort((a, b) => a - b)
          const p50 = sorted[Math.floor(sorted.length * 0.5)]
          const p95 = sorted[Math.floor(sorted.length * 0.95)]
          const p99 = sorted[Math.floor(sorted.length * 0.99)]
          
          lines.push(`# TYPE ${name}_p50 gauge`)
          lines.push(`${name}_p50 ${p50}`)
          
          lines.push(`# TYPE ${name}_p95 gauge`)
          lines.push(`${name}_p95 ${p95}`)
          
          lines.push(`# TYPE ${name}_p99 gauge`)
          lines.push(`${name}_p99 ${p99}`)
        }
      }
      
      return new NextResponse(lines.join('\n') + '\n', {
        headers: {
          'Content-Type': 'text/plain; version=0.0.4',
        },
      })
    }

    // Default JSON format
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      metrics: {
        counters: metrics.counters,
        histograms: metrics.histograms,
      },
    })
  } catch (error) {
    console.error('Error exporting calendar metrics:', error)
    return NextResponse.json(
      { error: 'Failed to export calendar metrics' },
      { status: 500 }
    )
  }
}
