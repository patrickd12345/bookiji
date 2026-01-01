import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VerdictBadge } from '@/components/simcity-cockpit/VerdictBadge'
import type { 
  SimCityReplayReport, 
  SimCityReplayDiff, 
  SimCityReplayMetricDelta, 
  ShadowComparisonReport,
  SimCityReplayVariant,
} from '@/app/api/ops/controlplane/_lib/simcity-types'
import { logger } from '@/lib/logger'

async function getReplaysData() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  try {
    const response = await fetch(`${baseUrl}/api/ops/controlplane/simcity/replays`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    return {
      replays: data.replays || [],
    }
  } catch (error) {
    logger.error('Failed to fetch replays data:', { error })
    return {
      replays: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function getShadowReport(window: string = '1h') {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  try {
    const response = await fetch(`${baseUrl}/api/ops/controlplane/simcity/shadow?window=${window}`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    return {
      report: data.report as ShadowComparisonReport | null,
      note: data.note,
    }
  } catch (error) {
    return {
      report: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function formatEventDiff(diff: SimCityReplayDiff): string {
  const delta = diff.variantCount - diff.baselineCount
  const sign = delta >= 0 ? '+' : ''
  return `${sign}${delta} events (${diff.baselineCount} → ${diff.variantCount})`
}

function formatMetricDelta(delta: SimCityReplayMetricDelta): string {
  if (delta.delta === null) return 'N/A'
  const sign = delta.delta >= 0 ? '+' : ''
  return `${sign}${delta.delta.toFixed(3)} (${delta.baselineValue?.toFixed(3) ?? 'N/A'} → ${delta.variantValue?.toFixed(3) ?? 'N/A'})`
}

export default async function CockpitReplaysPage() {
  const { replays, error } = await getReplaysData()
  const { report: shadowReport, error: shadowError } = await getShadowReport()

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

  // Trier les replays par date de génération (plus récent en premier)
  const sortedReplays = [...replays].sort((a, b) => {
    const dateA = new Date(a.entry.response.generatedAt).getTime()
    const dateB = new Date(b.entry.response.generatedAt).getTime()
    return dateB - dateA
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Replays & Diffs</CardTitle>
          <CardDescription>
            Visualisation des replays et des différences entre baseline et variants (Phase 5)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="replays" className="w-full">
            <TabsList>
              <TabsTrigger value="replays">Replays</TabsTrigger>
              <TabsTrigger value="shadow">Shadow Mode</TabsTrigger>
            </TabsList>

            <TabsContent value="replays" className="mt-4">
          {sortedReplays.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun replay disponible pour le moment.
            </div>
          ) : (
            <div className="space-y-6">
              {sortedReplays.map(({ runId, entry }) => {
                const report = entry.report
                const response = entry.response

                return (
                  <Card key={runId} className="border-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="font-mono text-lg">{runId}</CardTitle>
                          <CardDescription className="mt-1">
                            Seed: {response.seed} • Ticks: {response.fromTick} → {response.toTick}
                            {response.generatedAt && (
                              <> • Généré: {new Date(response.generatedAt).toLocaleString()}</>
                            )}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={
                            entry.status === 'completed'
                              ? 'default'
                              : entry.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {entry.status.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Summary */}
                      {response.baseline && (
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Baseline Summary</h4>
                          <div className="bg-gray-50 p-3 rounded text-sm">
                            <div>Total Events: {response.baseline.summary.totalEvents}</div>
                            <div className="mt-1">
                              Domains: {Object.keys(response.baseline.summary.eventsByDomain).join(', ')}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Variants */}
                      {response.variants.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Variants ({response.variants.length})</h4>
                          <div className="space-y-2">
                            {response.variants.map((variant: SimCityReplayVariant) => (
                              <div key={variant.name} className="bg-blue-50 p-3 rounded text-sm">
                                <div className="font-semibold">{variant.name}</div>
                                <div>Total Events: {variant.summary.totalEvents}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Report Diffs */}
                      {report && report.diffs.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Diffs</h4>
                          <div className="space-y-3">
                            {report.diffs.map((diff: SimCityReplayReport['diffs'][0], idx: number) => (
                              <div key={idx} className="border border-gray-200 rounded p-3">
                                <div className="font-semibold text-sm mb-2">Variant: {diff.variantName}</div>
                                
                                {/* Event Diffs */}
                                {diff.eventDiffs.length > 0 && (
                                  <div className="mb-3">
                                    <div className="text-xs font-semibold text-gray-600 mb-1">Event Diffs:</div>
                                    <div className="space-y-1">
                                      {diff.eventDiffs.slice(0, 5).map((eventDiff: SimCityReplayDiff, eIdx: number) => (
                                        <div key={eIdx} className="text-xs font-mono bg-gray-50 px-2 py-1 rounded">
                                          {eventDiff.domain}.{eventDiff.eventType}: {formatEventDiff(eventDiff)}
                                        </div>
                                      ))}
                                      {diff.eventDiffs.length > 5 && (
                                        <div className="text-xs text-gray-500">
                                          ... et {diff.eventDiffs.length - 5} autres diff events
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Metric Deltas */}
                                {diff.metricDeltas.length > 0 && (
                                  <div>
                                    <div className="text-xs font-semibold text-gray-600 mb-1">Metric Deltas:</div>
                                    <div className="space-y-1">
                                      {diff.metricDeltas.map((metricDelta: SimCityReplayMetricDelta, mIdx: number) => (
                                        <div key={mIdx} className="text-xs font-mono bg-blue-50 px-2 py-1 rounded">
                                          {metricDelta.metric}: {formatMetricDelta(metricDelta)}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Markdown Summary */}
                      {report && report.markdownSummary && (
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Report Summary</h4>
                          <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                            {report.markdownSummary}
                          </div>
                        </div>
                      )}

                      {/* Report Hash */}
                      {report && (
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Report Hash</h4>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {report.reportHash}
                          </code>
                        </div>
                      )}

                      {/* Error */}
                      {entry.status === 'failed' && entry.error && (
                        <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800">
                          <strong>Error:</strong> {entry.error}
                        </div>
                      )}

                      {/* Links */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Link
                          href={`/admin/simcity/cockpit/replays/${runId}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Voir les détails →
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
            </TabsContent>

            <TabsContent value="shadow" className="mt-4">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    ⚠️ Shadow Mode — No Effect on Production
                  </p>
                  <p className="text-xs text-blue-800">
                    Shadow mode simulates production events in SimCity without any side effects.
                    No writes, no proposals generated. Pure observation mode.
                  </p>
                </div>

                {shadowError ? (
                  <div className="text-red-600 text-sm">
                    Erreur lors du chargement du rapport shadow : {shadowError}
                  </div>
                ) : shadowReport ? (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Shadow Comparison Report</CardTitle>
                        <CardDescription>
                          Window: {shadowReport.window} • Report Hash: {shadowReport.reportHash.slice(0, 16)}...
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Hypothetical Verdict */}
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Hypothetical Verdict</h4>
                          <div className="flex items-center gap-2">
                            <VerdictBadge verdict={shadowReport.hypotheticalVerdict} />
                            <span className="text-xs text-gray-600">
                              (SimCity aurait {shadowReport.hypotheticalVerdict === 'allow' ? 'autorisé' : shadowReport.hypotheticalVerdict === 'warn' ? 'averti' : 'bloqué'})
                            </span>
                          </div>
                        </div>

                        {/* Metrics Comparison */}
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Metrics Comparison</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Metric</th>
                                  <th className="text-right py-2 px-3 font-semibold text-gray-700">SimCity</th>
                                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Production</th>
                                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Delta</th>
                                </tr>
                              </thead>
                              <tbody>
                                {shadowReport.deltas.map((delta: ShadowComparisonReport['deltas'][0]) => (
                                  <tr key={delta.metric} className="border-b border-gray-100">
                                    <td className="py-2 px-3 font-mono text-xs">{delta.metric}</td>
                                    <td className="py-2 px-3 text-right font-mono">
                                      {delta.simcityValue.toFixed(3)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono">
                                      {delta.prodValue.toFixed(3)}
                                    </td>
                                    <td className={`py-2 px-3 text-right font-mono ${
                                      Math.abs(delta.delta) > 0.1 ? 'text-red-600 font-semibold' : 'text-gray-600'
                                    }`}>
                                      {delta.delta >= 0 ? '+' : ''}{delta.delta.toFixed(3)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Divergence Flags */}
                        {shadowReport.divergenceFlags.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm text-gray-700 mb-2">Divergence Flags</h4>
                            <div className="space-y-1">
                              {shadowReport.divergenceFlags.map((flag: string, idx: number) => (
                                <div key={idx} className="text-xs bg-yellow-50 border border-yellow-200 px-3 py-2 rounded">
                                  {flag}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Report Hash */}
                        <div className="pt-4 border-t">
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Report Hash</h4>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded block break-all">
                            {shadowReport.reportHash}
                          </code>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Aucun rapport shadow disponible. Phase 10 est en mode stub.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

