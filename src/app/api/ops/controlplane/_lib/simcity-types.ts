export type SimCityEventType = 'domain.signal' | 'proposal.generated' | (string & {})

export type SimCityEvent = {
  id: string
  tick: number
  domain: string
  type: SimCityEventType
  payload: Record<string, unknown>
}

export type SimCityEventEnvelope = {
  version: 1
  seed: number
  generatedAtTick: number
  event: SimCityEvent
}

export type SimCityEventSpec = {
  domain: string
  type: SimCityEventType
  payload: Record<string, unknown>
}

export type SimCityProposal = {
  id: string
  tick: number
  domain: string
  action: string
  description: string
  confidence: number
  evidenceEventIds: string[]
  source: 'llm' | 'rules'
}

export type ProposalMode = 'llm' | 'rules' | 'hybrid' | 'off'

export type SimCityProposalConfig = {
  mode: ProposalMode
  maxPerTick?: number
  minConfidence?: number
}
