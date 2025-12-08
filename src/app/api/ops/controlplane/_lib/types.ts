import type { Incident } from '@/types/incidents'

export type PersonaMode = 'engineer' | 'manager' | 'detective' | 'narrator'

export type DeploymentRecord = {
  id?: string
  service?: string
  version?: string
  status?: string
  startedAt?: string
  completedAt?: string | null
}

export type AgentDescriptor = {
  id: string
  name: string
  status: 'healthy' | 'degraded' | 'offline' | 'unknown'
  lastUpdated: string
  lastAction?: string
  insight?: string
}

export type ControlPlaneOverview = {
  timestamp: string
  health: { overall?: string; services?: Array<{ name: string; status: string }> }
  metrics: {
    bookings?: any
    system?: any
  }
  deployments: DeploymentRecord[]
  incidents: Incident[]
  predictions: {
    healthTrend?: { trend: string; confidence: number; nextEstimate: number }
    bookingsTrend?: { trend: string; confidence: number; nextEstimate: number }
  }
  agents: AgentDescriptor[]
  eventStream: { endpoint: string; status: 'ready' | 'degraded' }
}

export type ControlPlaneEvent = {
  id: string
  type: 'health_change' | 'incident_created' | 'deployment_created' | 'prediction_update' | 'control_command'
  timestamp: string
  message: string
  data?: Record<string, unknown>
}

export type CommandRequest = {
  command: string
  args?: Record<string, any>
}

export type CommandResponse = {
  accepted: boolean
  message: string
  executedAt: string
  result?: any
}

export type Playbook = {
  id: string
  name: string
  description: string
  trigger: {
    type: 'metric' | 'health' | 'deployment' | 'incident'
    condition: string
  }
  steps: {
    id: string
    label: string
    action?: string
  }[]
  tags?: string[]
}

export type EvaluatedPlaybook = Playbook & {
  hot: boolean
  reasons?: string[]
}

export type TimeMachineState = {
  at: string
  health: { overall?: string; services?: Array<{ name: string; status: string }> }
  deployments: DeploymentRecord[]
  incidents: Incident[]
  metrics: Record<string, unknown>
  notes?: string[]
}

export type TimeMachineDiff = {
  from: string
  to: string
  changes: {
    healthChanged: boolean
    healthFrom?: string
    healthTo?: string
    deploymentsDelta: number
    incidentsDelta: number
    metricsDelta: Record<string, { from?: number; to?: number }>
  }
  summary: string
}
