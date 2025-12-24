import { NextRequest } from 'next/server'
import type { Incident } from '@/types/incidents'
import { predictBookingThroughput, predictHealthTrend } from '../../../../../../packages/opsai-l7/src/predict'
import { diagnose } from '../../../../../../packages/opsai-helpdesk/src/engine'
import type { ControlPlaneOverview, DeploymentRecord } from './types'
import { buildAgents } from './agents'
import { createOpsClient } from './ops-client'

function normalizeIncidents(payload: unknown): Incident[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload as Incident[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof payload === 'object' && Array.isArray((payload as any).incidents)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (payload as any).incidents as Incident[]
  }
  return []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sampleSeriesFromMetrics(metrics: any): number[] {
  if (!metrics) return []
  const points =
    metrics?.analysis?.series ||
    metrics?.raw_metrics ||
    metrics?.series ||
    metrics?.data ||
    []
  if (Array.isArray(points)) {
    return points
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) =>
        typeof p === 'number'
          ? p
          : typeof p?.value === 'number'
          ? p.value
          : typeof p?.cpu_percent === 'number'
          ? p.cpu_percent
          : null
      )
      .filter((v: number | null): v is number => v !== null)
      .slice(-5)
  }
  return []
}

export async function fetchControlPlaneOverview(
  request: NextRequest
): Promise<ControlPlaneOverview> {
  const baseUrl =
    process.env.OPS_API_BASE ||
    process.env.NEXT_PUBLIC_OPS_BASE ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    new URL(request.url).origin

  const opsai = createOpsClient(baseUrl)

  const [summary, bookingsMetrics, systemMetrics, deploymentsRaw, incidentsRaw] =
    await Promise.all([
      opsai.summary(),
      opsai.metrics('bookings').catch(() => ({})),
      opsai.metrics('system').catch(() => ({})),
      opsai.deployments().catch(() => []),
      opsai.incidents().catch(() => [])
    ])

  const deployments: DeploymentRecord[] = Array.isArray(deploymentsRaw)
    ? (deploymentsRaw as DeploymentRecord[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : Array.isArray((deploymentsRaw as any)?.deployments)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? ((deploymentsRaw as any).deployments as DeploymentRecord[])
    : []

  const incidents = normalizeIncidents(incidentsRaw)

  const healthSeries = sampleSeriesFromMetrics(systemMetrics)
  const bookingSamples =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array.isArray((bookingsMetrics as any)?.raw_metrics) &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bookingsMetrics as any).raw_metrics.length >= 2
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? ((bookingsMetrics as any).raw_metrics as Array<{ timestamp?: string; value?: number }>)
      : [
          { timestamp: new Date(Date.now() - 3600_000).toISOString(), value: 120 },
          { timestamp: new Date().toISOString(), value: 95 }
        ]

  const predictions = {
    healthTrend: predictHealthTrend(
      healthSeries.length ? healthSeries : [0.82, 0.76, 0.71]
    ),
    bookingsTrend: predictBookingThroughput(
      bookingSamples
        .filter((p) => typeof p.value === 'number' && p.timestamp)
        .map((p) => ({ timestamp: p.timestamp as string, value: p.value as number }))
    )
  }

  // Lightweight helpdesk check to surface an insight
  const helpdesk = diagnose('', {
    summary: { deployments, health: { overall: summary?.health?.overall } },
    metrics: {
      bookings: {
        baseline: bookingSamples?.[0]?.value,
        current: bookingSamples?.[bookingSamples.length - 1]?.value
      },
      health: { trend: predictions.healthTrend.trend }
    }
  })

  const agents = buildAgents({
    summary,
    incidents,
    predictions,
    helpdesk
  })

  return {
    timestamp: new Date().toISOString(),
    health: summary?.health || { overall: 'unknown', services: [] },
    metrics: {
      bookings: bookingsMetrics,
      system: systemMetrics
    },
    deployments,
    incidents,
    predictions,
    agents,
    eventStream: {
      endpoint: '/api/ops/controlplane/events',
      status: 'ready'
    }
  }
}
