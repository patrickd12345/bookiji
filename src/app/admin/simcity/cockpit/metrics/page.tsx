import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { METRICS_REGISTRY } from '@/app/api/ops/controlplane/_lib/simcity-metrics'
import { DEFAULT_DIALS } from '@/app/api/ops/controlplane/_lib/simcity-dials'
import type { DialStatus, MetricId } from '@/app/api/ops/controlplane/_lib/simcity-types'
import { logger } from '@/lib/logger'

async function getMetricsData() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  try {
    const response = await fetch(`${baseUrl}/api/ops/controlplane/simcity/dials/snapshot`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    return {
      tick: data.tick || 0,
      metrics: data.metrics || {} as Record<MetricId, number>,
      dialStatuses: (data.dialStatuses || []) as DialStatus[],
    }
  } catch (error) {
    logger.error('Failed to fetch metrics data:', { error })
    return {
      tick: 0,
      metrics: {} as Record<MetricId, number>,
      dialStatuses: [] as DialStatus[],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function getZoneColor(zone: 'green' | 'yellow' | 'red') {
  switch (zone) {
    case 'green':
      return 'bg-green-100 text-green-800 border-green-300'
    case 'yellow':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'red':
      return 'bg-red-100 text-red-800 border-red-300'
  }
}

function formatMetricValue(value: number, unit: string): string {
  if (unit === 'ratio') {
    return (value * 100).toFixed(2) + '%'
  }
  return value.toFixed(2) + ' ' + unit
}

export default async function CockpitMetricsPage() {
  const { tick, metrics, dialStatuses, error } = await getMetricsData()

  const _dialMap = new Map(DEFAULT_DIALS.map(d => [d.metric, d]))
  const dialStatusMap = new Map(dialStatuses.map(d => [d.metric, d]))

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Erreur</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Impossible de charger les données : {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dials Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Dials (6 dials)</CardTitle>
          <CardDescription>
            Zones de couleur et seuils pour chaque métrique (read-only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEFAULT_DIALS.map((dial) => {
              const dialStatus = dialStatusMap.get(dial.metric)
              const metric = METRICS_REGISTRY[dial.metric]
              const value = metrics[dial.metric] ?? 0

              return (
                <div
                  key={dial.metric}
                  className={`p-4 rounded-lg border-2 ${
                    dialStatus
                      ? getZoneColor(dialStatus.zone)
                      : 'bg-gray-100 text-gray-800 border-gray-300'
                  }`}
                >
                  <div className="font-mono text-sm font-semibold mb-2">
                    {dial.metric}
                  </div>
                  <div className="text-2xl font-bold mb-3">
                    {formatMetricValue(value, metric.unit)}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div>
                      🟢 Green: [{dial.green[0]}, {dial.green[1]}]
                    </div>
                    <div>
                      🟡 Yellow: [{dial.yellow[0]}, {dial.yellow[1]}]
                    </div>
                    <div>
                      🔴 Red: [{dial.red[0]}, {dial.red[1]}]
                    </div>
                  </div>
                  {dialStatus && (
                    <div className="mt-2 text-xs font-semibold">
                      Zone: {dialStatus.zone.toUpperCase()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Registry */}
      <Card>
        <CardHeader>
          <CardTitle>Metrics Registry</CardTitle>
          <CardDescription>
            Liste complète de toutes les métriques avec leurs définitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Metric ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Domain</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Unit</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Direction</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Current Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(METRICS_REGISTRY).map(([metricId, metric]) => {
                  const value = metrics[metricId as MetricId] ?? 0
                  const dialStatus = dialStatusMap.get(metricId as MetricId)

                  return (
                    <tr key={metricId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-semibold">{metricId}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{metric.domain}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{metric.description}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{metric.unit}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                          {metric.direction === 'higher-is-better' ? '↑ Higher is better' : '↓ Lower is better'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono font-semibold">
                            {formatMetricValue(value, metric.unit)}
                          </span>
                          {dialStatus && (
                            <span className={`text-xs px-2 py-1 rounded font-semibold ${getZoneColor(dialStatus.zone)}`}>
                              {dialStatus.zone.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informations Système</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600">Tick actuel:</span>
              <span className="ml-2 font-mono font-semibold">{tick}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Nombre de métriques:</span>
              <span className="ml-2 font-semibold">{Object.keys(METRICS_REGISTRY).length}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Nombre de dials:</span>
              <span className="ml-2 font-semibold">{DEFAULT_DIALS.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

