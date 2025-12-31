import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VerdictBadge } from '@/components/simcity-cockpit/VerdictBadge'
import { HashCopy } from '@/components/simcity-cockpit/HashCopy'
import type { PromotionDecision } from '@/app/api/ops/controlplane/_lib/simcity-types'
import { logger } from '@/lib/logger'

async function getOverviewData() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  try {
    const response = await fetch(`${baseUrl}/api/ops/controlplane/simcity/governance`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    return {
      tick: data.tick || 0,
      decisions: (data.decisions || []) as PromotionDecision[],
    }
  } catch (error) {
    logger.error('Failed to fetch governance data:', { error })
    return {
      tick: 0,
      decisions: [] as PromotionDecision[],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function getVerdictCounts(decisions: PromotionDecision[]) {
  return {
    allow: decisions.filter(d => d.verdict === 'allow').length,
    warn: decisions.filter(d => d.verdict === 'warn').length,
    block: decisions.filter(d => d.verdict === 'block').length,
  }
}

function getOverallVerdict(decisions: PromotionDecision[]): 'allow' | 'warn' | 'block' {
  if (decisions.length === 0) return 'allow'
  
  // Le verdict le plus sévère détermine le verdict global
  if (decisions.some(d => d.verdict === 'block')) return 'block'
  if (decisions.some(d => d.verdict === 'warn')) return 'warn'
  return 'allow'
}

export default async function CockpitOverviewPage() {
  const { tick, decisions, error } = await getOverviewData()

  if (error) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Erreur</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">Impossible de charger les données : {error}</p>
            <p className="text-sm text-gray-600 mt-2">
              Vérifiez que SimCity est en cours d&apos;exécution et que les APIs sont accessibles.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const counts = getVerdictCounts(decisions)
  const overallVerdict = getOverallVerdict(decisions)
  const latestDecision = decisions.length > 0 ? decisions[0] : null

  return (
    <div className="space-y-6">
      {/* Verdict Global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Verdict Global</span>
            <VerdictBadge verdict={overallVerdict} size="lg" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-700">{counts.allow}</div>
              <div className="text-sm text-green-600 mt-1">ALLOW</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-3xl font-bold text-yellow-700">{counts.warn}</div>
              <div className="text-sm text-yellow-600 mt-1">WARN</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-700">{counts.block}</div>
              <div className="text-sm text-red-600 mt-1">BLOCK</div>
            </div>
          </div>

          {decisions.length > 0 && latestDecision && (
            <div className="space-y-2 pt-4 border-t">
              <HashCopy hash={latestDecision.decisionHash} label="Decision Hash" />
              <HashCopy hash={latestDecision.inputsHash} label="Inputs Hash" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informations Système */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Informations Système</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Tick actuel:</span>
              <span className="font-mono font-semibold">{tick}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Nombre de propositions:</span>
              <span className="font-semibold">{decisions.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Policy version:</span>
              <span className="font-mono text-sm">v1 (défaut)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résumé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              {overallVerdict === 'allow' && (
                <>🟢 Promotion autorisée. Aucun blocage détecté.</>
              )}
              {overallVerdict === 'warn' && (
                <>🟡 Promotion autorisée avec avertissements. Révision recommandée.</>
              )}
              {overallVerdict === 'block' && (
                <>🔴 Promotion bloquée. Des propositions nécessitent une attention immédiate.</>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dernières Décisions */}
      {decisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dernières Décisions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {decisions.slice(0, 5).map((decision) => (
                <div
                  key={decision.proposalId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-mono text-sm font-semibold">{decision.proposalId}</div>
                    <div className="text-xs text-gray-600">
                      {decision.domain} • {decision.action}
                    </div>
                  </div>
                  <VerdictBadge verdict={decision.verdict} />
                </div>
              ))}
            </div>
            {decisions.length > 5 && (
              <p className="text-sm text-gray-600 mt-4 text-center">
                ... et {decisions.length - 5} autres décisions
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {decisions.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Aucune proposition disponible pour le moment.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

