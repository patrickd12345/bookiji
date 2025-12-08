import { OpsAI } from '@bookiji/opsai'
import type {
  ControlPlaneOverview,
  CommandRequest,
  CommandResponse,
  Playbook,
  EvaluatedPlaybook,
  TimeMachineState,
  TimeMachineDiff,
  AgentDescriptor
} from '../../../../src/app/api/ops/controlplane/_lib/types'

const BASE_PATH = '/api/ops/controlplane'

function resolveBase() {
  return (
    import.meta.env.VITE_OPS_BASE ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  )
}

const opsai = new OpsAI({
  baseUrl: resolveBase(),
  fetchImpl: fetch,
  cacheTtlMs: 5000
})

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${resolveBase()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return (await res.json()) as T
}

export const opsaiClient = {
  baseUrl: resolveBase,
  sdk: opsai,
  overview: () => json<ControlPlaneOverview>(`${BASE_PATH}/overview`),
  agents: () => json<{ agents: AgentDescriptor[] }>(`${BASE_PATH}/agents`),
  agent: (id: string) => json<AgentDescriptor>(`${BASE_PATH}/agents/${id}`),
  command: (payload: CommandRequest) =>
    json<CommandResponse>(`${BASE_PATH}/commands`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  timeMachineState: (at: string) =>
    json<TimeMachineState>(`${BASE_PATH}/timemachine/state?at=${encodeURIComponent(at)}`),
  timeMachineDiff: (from: string, to: string) =>
    json<TimeMachineDiff>(
      `${BASE_PATH}/timemachine/diff?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    ),
  playbooks: () => json<{ playbooks: Playbook[] }>(`${BASE_PATH}/playbooks`),
  playbook: (id: string) => json<Playbook>(`${BASE_PATH}/playbooks/${id}`),
  evaluatePlaybooks: (state: {
    health?: string
    metrics?: any
    incidents?: any[]
  }) =>
    json<{ playbooks: EvaluatedPlaybook[] }>(`${BASE_PATH}/playbooks/evaluate`, {
      method: 'POST',
      body: JSON.stringify(state)
    }),
  eventsUrl: () => `${BASE_PATH}/events`
}
