import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { VerdictBadge } from '@/components/simcity-cockpit/VerdictBadge'
import { HashCopy } from '@/components/simcity-cockpit/HashCopy'
import { CopyDecisionButton } from '@/components/simcity-cockpit/CopyDecisionButton'
import { AlertTriangle, Info, XCircle, User } from 'lucide-react'
import type { PromotionDecision, DialStatus, GovernanceReason, OverrideRecord } from '@/app/api/ops/controlplane/_lib/simcity-types'
import { METRICS_REGISTRY } from '@/app/api/ops/controlplane/_lib/simcity-metrics'
import { DEFAULT_DIALS } from '@/app/api/ops/controlplane/_lib/simcity-dials'

async function getProposalDetail(proposalId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  try {
    const [decisionResponse, dialsResponse, overridesResponse] = await Promise.all([
      fetch(`${baseUrl}/api/ops/controlplane/simcity/governance/${proposalId}`, {
        cache: 'no-store',
      }),
      fetch(`${baseUrl}/api/ops/controlplane/simcity/dials/snapshot`, {
        cache: 'no-store',
      }),
      fetch(`${baseUrl}/api/ops/controlplane/simcity/overrides?proposalId=${proposalId}`, {
        cache: 'no-store',
      }),
    ])

    if (!decisionResponse.ok) {
      if (decisionResponse.status === 404) {
        return { decision: null, error: 'NOT_FOUND' }
      }
      throw new Error(`API returned ${decisionResponse.status}`)
    }

    const decisionData = await decisionResponse.json()
    const decision = decisionData.decision as PromotionDecision
    
    let metrics: Record<string, number> = {}
    let dialStatuses: DialStatus[] = []
    
    if (dialsResponse.ok) {
      const dialsData = await dialsResponse.json()
      metrics = dialsData.metrics || {}
      dialStatuses = dialsData.dialStatuses || []
    }

    let overrides: OverrideRecord[] = []
    if (overridesResponse.ok) {
      const overridesData = await overridesResponse.json()
      overrides = (overridesData.overrides || []) as OverrideRecord[]
    }

    return {
      decision,
      metrics,
      dialStatuses,
      overrides,
    }
  } catch (error) {
    console.error('Failed to fetch proposal detail:', error)
    return {
      decision: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function getSeverityIcon(severity: GovernanceReason['severity']) {
  switch (severity) {
    case 'block':
      return <XCircle className="h-5 w-5 text-red-600" />
    case 'warn':
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    case 'info':
      return <Info className="h-5 w-5 text-blue-600" />
  }
}

function formatEvidenceValue(value: unknown): string {
  if (typeof value === 'number') {
    return value.toFixed(3)
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

function convertOverrideVerdictToGovernanceVerdict(verdict: string): 'allow' | 'warn' | 'block' {
  const lower = verdict.toLowerCase()
  if (lower === 'allow' || lower === 'warn' || lower === 'block') {
    return lower as 'allow' | 'warn' | 'block'
  }
  return 'allow'
}

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ proposalId: string }>
}) {
  const { proposalId } = await params
  const { decision, metrics, dialStatuses, overrides, error } = await getProposalDetail(proposalId)

  if (error === 'NOT_FOUND' || !decision) {
    notFound()
  }

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

  const dialMap = new Map(DEFAULT_DIALS.map(d => [d.metric, d]))
  const dialStatusMap = new Map(dialStatuses.map(d => [d.metric, d]))

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3">
                <span className="font-mono">{decision.proposalId}</span>
                {/* Show final verdict: last override if exists, otherwise machine verdict */}
                {overrides && overrides.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <VerdictBadge 
                      verdict={convertOverrideVerdictToGovernanceVerdict(overrides[overrides.length - 1].verdictAfter)} 
                      size="lg" 
                    />
                    <span className="text-xs text-gray-500">(Override humain)</span>
                  </div>
                ) : (
                  <VerdictBadge verdict={decision.verdict} size="lg" />
                )}
              </CardTitle>
              <CardDescription className="mt-2">
                {decision.domain} • {decision.action}
              </CardDescription>
            </div>
            <CopyDecisionButton decision={decision} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <HashCopy hash={decision.decisionHash} label="Decision Hash" />
          <HashCopy hash={decision.inputsHash} label="Inputs Hash" />
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Évalué au tick:</span>
            <span className="font-mono font-semibold">{decision.evaluatedAtTick}</span>
          </div>
        </CardContent>
      </Card>

      {/* Timeline: Decision + Overrides */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>
            Décision machine et overrides humains (Phase 9)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Machine Decision */}
            <div className="flex items-start gap-4 pb-4 border-b border-gray-200">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-semibold">M</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">Décision Machine</span>
                  <VerdictBadge verdict={decision.verdict} />
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Tick {decision.evaluatedAtTick} • Decision Hash: {decision.decisionHash.slice(0, 16)}...
                </p>
                <p className="text-xs text-gray-500">
                  Décision automatique générée par le moteur de gouvernance
                </p>
              </div>
            </div>

            {/* Human Overrides */}
            {overrides && overrides.length > 0 ? (
              overrides.map((override, idx) => (
                <div key={override.overrideId} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">Override Humain #{idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {override.verdictBefore} →
                        </span>
                        <VerdictBadge verdict={convertOverrideVerdictToGovernanceVerdict(override.verdictAfter)} />
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{override.actor.userId}</span>
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                          {override.actor.role}
                        </span>
                      </div>
                      <p className="mt-1">{override.justification}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(override.timestamp).toLocaleString()} • Override Hash: {override.overrideHash.slice(0, 16)}...
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                Aucun override humain enregistré
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section A - Governance Reasons */}
      <Card>
        <CardHeader>
          <CardTitle>Governance Reasons</CardTitle>
          <CardDescription>
            Détails de toutes les règles de gouvernance qui ont contribué à cette décision
          </CardDescription>
        </CardHeader>
        <CardContent>
          {decision.reasons.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucune raison de gouvernance enregistrée
            </p>
          ) : (
            <div className="space-y-4">
              {decision.reasons.map((reason, idx) => (
                <div
                  key={idx}
                  className="border-l-4 border-gray-200 pl-4 py-3 bg-gray-50 rounded-r-lg"
                >
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(reason.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold text-gray-700">
                          {reason.ruleId}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          reason.severity === 'block' ? 'bg-red-100 text-red-700' :
                          reason.severity === 'warn' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {reason.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{reason.message}</p>
                      {reason.evidence && (
                        <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                          <div className="text-xs font-semibold text-gray-600 mb-2">Evidence:</div>
                          <div className="space-y-2">
                            {Object.entries(reason.evidence).map(([key, value]) => (
                              <div key={key} className="flex items-start gap-2">
                                <span className="text-xs font-mono text-gray-600 min-w-[100px]">
                                  {key}:
                                </span>
                                <span className="text-xs font-mono text-gray-800">
                                  {formatEvidenceValue(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section B - Overrides */}
      {decision.requiredOverrides && decision.requiredOverrides.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overrides Requis</CardTitle>
            <CardDescription>
              Overrides nécessaires pour cette proposition (read-only - Phase 9 pour l&apos;action)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {decision.requiredOverrides.map((override, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-orange-50 border border-orange-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-orange-900">Override #{idx + 1}</span>
                    <span className="text-xs px-2 py-1 bg-orange-200 text-orange-800 rounded">
                      {override.roleRequired.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-orange-800">{override.reason}</p>
                  {override.expiresAfterTicks && (
                    <p className="text-xs text-orange-600 mt-2">
                      Expire après {override.expiresAfterTicks} ticks
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section C - Metrics Snapshot */}
      <Card>
        <CardHeader>
          <CardTitle>Metrics Snapshot</CardTitle>
          <CardDescription>
            Valeurs des métriques actuelles (baseline vs candidate si disponible)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Metric</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Value</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Dial Zone</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Thresholds</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(METRICS_REGISTRY).map(([metricId, metricDef]) => {
                  const value = metrics[metricId] ?? 0
                  const dialStatus = dialStatusMap.get(metricId as any)
                  const dial = dialMap.get(metricId as any)
                  
                  const zoneColor = dialStatus
                    ? dialStatus.zone === 'green' ? 'bg-green-100 text-green-800' :
                      dialStatus.zone === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'

                  return (
                    <tr key={metricId} className="border-b border-gray-100">
                      <td className="py-2 px-3">
                        <div>
                          <div className="font-mono text-sm font-semibold">{metricId}</div>
                          <div className="text-xs text-gray-600">{metricDef.description}</div>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className="font-mono font-semibold">
                          {metricDef.unit === 'ratio' 
                            ? (value * 100).toFixed(2) + '%'
                            : value.toFixed(2)
                          } {metricDef.unit}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {dialStatus ? (
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${zoneColor}`}>
                            {dialStatus.zone.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-600">
                        {dial ? (
                          <div className="space-y-1">
                            <div>🟢 [{dial.green[0]}, {dial.green[1]}]</div>
                            <div>🟡 [{dial.yellow[0]}, {dial.yellow[1]}]</div>
                            <div>🔴 [{dial.red[0]}, {dial.red[1]}]</div>
                          </div>
                        ) : (
                          <span>N/A</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

