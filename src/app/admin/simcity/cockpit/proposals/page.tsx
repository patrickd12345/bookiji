import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VerdictBadge } from '@/components/simcity-cockpit/VerdictBadge'
import { HashCopy } from '@/components/simcity-cockpit/HashCopy'
import type { PromotionDecision, SimCityProposal } from '@/app/api/ops/controlplane/_lib/simcity-types'

async function getProposalsData() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  try {
    const [governanceRes, proposalsRes] = await Promise.all([
      fetch(`${baseUrl}/api/ops/controlplane/simcity/governance`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/ops/controlplane/simcity/proposals`, { cache: 'no-store' }),
    ])

    if (!governanceRes.ok || !proposalsRes.ok) {
      throw new Error(`API returned error`)
    }

    const governanceData = await governanceRes.json()
    const proposalsData = await proposalsRes.json()

    const decisions = (governanceData.decisions || []) as PromotionDecision[]
    const proposals = (proposalsData.proposals || []) as SimCityProposal[]

    // Créer un map des décisions par proposalId pour faciliter l'accès
    const decisionMap = new Map(decisions.map(d => [d.proposalId, d]))

    // Combiner les propositions avec leurs décisions
    const proposalsWithDecisions = proposals.map(proposal => ({
      proposal,
      decision: decisionMap.get(proposal.id),
    }))

    // Trier par ID (déterministe)
    proposalsWithDecisions.sort((a, b) => a.proposal.id.localeCompare(b.proposal.id))

    return {
      proposals: proposalsWithDecisions,
    }
  } catch (error) {
    console.error('Failed to fetch proposals data:', error)
    return {
      proposals: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export default async function CockpitProposalsPage() {
  const { proposals, error } = await getProposalsData()

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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Propositions</CardTitle>
        </CardHeader>
        <CardContent>
          {proposals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucune proposition disponible pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Proposal ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Variant ID / Run ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Verdict</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Reasons</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Override Required?</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Decision Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map(({ proposal, decision }) => (
                    <tr
                      key={proposal.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/simcity/cockpit/proposals/${proposal.id}`}
                          className="font-mono text-sm text-blue-600 hover:underline"
                        >
                          {proposal.id}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {proposal.id}
                      </td>
                      <td className="py-3 px-4">
                        {decision ? (
                          <VerdictBadge verdict={decision.verdict} />
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {decision && decision.reasons.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {decision.reasons.slice(0, 2).map((reason, idx) => (
                              <span key={idx} className="text-gray-700">
                                {reason.ruleId}: {reason.message}
                              </span>
                            ))}
                            {decision.reasons.length > 2 && (
                              <span className="text-gray-500 text-xs">
                                +{decision.reasons.length - 2} autres
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Aucune</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {decision && decision.requiredOverrides && decision.requiredOverrides.length > 0 ? (
                          <span className="text-orange-600 font-semibold">Oui</span>
                        ) : (
                          <span className="text-gray-400">Non</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {decision ? (
                          <HashCopy hash={decision.decisionHash} truncateLength={12} />
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

