import { recommendActions } from '../../../../../../packages/opsai-helpdesk/src/engine'
import type { Incident } from '@/types/incidents'
import type { EvaluatedPlaybook, Playbook } from './types'

const PLAYBOOKS: Playbook[] = [
  {
    id: 'deployment-regression',
    name: 'Deployment Regression Containment',
    description: 'Rollback the last deployment and trigger regression AI analysis',
    trigger: { type: 'deployment', condition: 'New deploy with error spike' },
    steps: [
      { id: '1', label: 'Freeze deployments', action: 'deploy freeze' },
      { id: '2', label: 'Rollback to previous version', action: 'deploy rollback --previous' },
      { id: '3', label: 'Run regression diff', action: 'regression diff --baseline=last-stable' }
    ],
    tags: ['deployment', 'regression']
  },
  {
    id: 'booking-anomaly',
    name: 'Booking Anomaly Triage',
    description: 'Investigate booking throughput drops and trigger L7 synthetic checks',
    trigger: { type: 'metric', condition: 'Bookings drop >20% vs baseline' },
    steps: [
      { id: '1', label: 'Trigger synthetic booking check', action: 'trigger synthetic-check' },
      { id: '2', label: 'Inspect booking pipeline logs', action: 'logs tail bookings --limit=200' },
      { id: '3', label: 'Notify on-call' }
    ],
    tags: ['metrics', 'bookings']
  },
  {
    id: 'incident-severe',
    name: 'Critical Incident Bridge',
    description: 'Escalate and coordinate response for critical incidents',
    trigger: { type: 'incident', condition: 'Severity is critical or high' },
    steps: [
      { id: '1', label: 'Page incident commander', action: 'page oncall --role=ic' },
      { id: '2', label: 'Open bridge', action: 'open bridge --channel=ops' },
      { id: '3', label: 'Share latest OpsAI summary', action: 'opsai summary' }
    ],
    tags: ['incident', 'response']
  },
  {
    id: 'health-degraded',
    name: 'Health Degradation Investigation',
    description: 'Proactive mitigation when health dips below green',
    trigger: { type: 'health', condition: 'Health overall != green' },
    steps: [
      { id: '1', label: 'Restart risky components', action: 'restart api' },
      { id: '2', label: 'Flush cache', action: 'flush cache' },
      { id: '3', label: 'Re-run synthetic checks', action: 'trigger synthetic-check' }
    ],
    tags: ['health', 'reliability']
  }
]

type EvaluationInput = {
  health?: string
  metrics?: any
  incidents?: Incident[]
}

export function listPlaybooks(): Playbook[] {
  return PLAYBOOKS
}

export function getPlaybook(id: string): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.id === id)
}

export function evaluatePlaybooks(input: EvaluationInput): EvaluatedPlaybook[] {
  const incidents = input.incidents || []
  const recommendations = recommendActions({
    summary: { health: { overall: input.health } },
    metrics: input.metrics
  })

  return PLAYBOOKS.map((playbook) => {
    const reasons: string[] = []
    let hot = false

    if (playbook.trigger.type === 'health' && input.health && input.health.toLowerCase() !== 'green') {
      hot = true
      reasons.push(`Health is ${input.health}`)
    }

    if (
      playbook.trigger.type === 'metric' &&
      typeof input.metrics?.bookings?.current === 'number' &&
      typeof input.metrics?.bookings?.baseline === 'number'
    ) {
      const drop = input.metrics.bookings.current / Math.max(1, input.metrics.bookings.baseline)
      if (drop < 0.8) {
        hot = true
        reasons.push('Bookings below 80% baseline')
      }
    }

    if (playbook.trigger.type === 'incident') {
      const severe = incidents.some((i) => i.severity === 'high' || i.severity === 'critical')
      if (severe) {
        hot = true
        reasons.push('High severity incident present')
      }
    }

    if (playbook.trigger.type === 'deployment') {
      const deploymentIncident = incidents.some((i) =>
        (i.tags || []).includes('deployment') || i.description.toLowerCase().includes('deploy')
      )
      if (deploymentIncident) {
        hot = true
        reasons.push('Deployment related incident detected')
      }
    }

    const matchingRecommendation = recommendations.find((r) =>
      r.toLowerCase().includes(playbook.trigger.type)
    )
    if (matchingRecommendation) {
      hot = true
      reasons.push(matchingRecommendation)
    }

    return {
      ...playbook,
      hot,
      reasons
    }
  })
}
