import type { Incident } from '@/types/incidents'
import type { AgentDescriptor } from './types'

type BuildAgentsInput = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  summary: any
  incidents: Incident[]
  predictions: {
    healthTrend?: { trend: string; confidence: number }
    bookingsTrend?: { trend: string; confidence: number }
  }
  helpdesk?: { recommendations?: string[]; severity?: string; issues?: string[] }
}

function deriveStatus(overall?: string): AgentDescriptor['status'] {
  if (!overall) return 'unknown'
  const normalized = overall.toLowerCase()
  if (['green', 'ok', 'healthy'].includes(normalized)) return 'healthy'
  if (['yellow', 'warn', 'warning', 'degraded'].includes(normalized)) return 'degraded'
  if (['red', 'critical', 'down'].includes(normalized)) return 'offline'
  return 'unknown'
}

export function buildAgents(input: BuildAgentsInput): AgentDescriptor[] {
  const now = new Date().toISOString()
  const { summary, incidents, predictions, helpdesk } = input
  const overallStatus = deriveStatus(summary?.health?.overall)
  const openIncidents = incidents?.length || 0
  const bookingTrend = predictions.bookingsTrend?.trend

  const commonInsight =
    helpdesk?.issues?.length && helpdesk?.recommendations?.length
      ? `${helpdesk.recommendations[0]}`
      : bookingTrend === 'down'
      ? 'Booking throughput trending down; consider synthetic checks'
      : 'System stable'

  const base: AgentDescriptor[] = [
    {
      id: 'regression',
      name: 'RegressionAI',
      status: openIncidents > 0 ? 'degraded' : overallStatus,
      lastUpdated: now,
      lastAction:
        openIncidents > 0
          ? `Tracking ${openIncidents} active incident${openIncidents === 1 ? '' : 's'}`
          : 'Watching regression baselines',
      insight: commonInsight
    },
    {
      id: 'metrics',
      name: 'MetricsAI',
      status: bookingTrend === 'down' ? 'degraded' : overallStatus,
      lastUpdated: now,
      lastAction:
        bookingTrend === 'down'
          ? 'Detected booking drop; recommending capacity check'
          : 'Metrics healthy',
      insight:
        predictions.bookingsTrend &&
        `Bookings trend ${predictions.bookingsTrend.trend} (conf ${predictions.bookingsTrend.confidence})`
    },
    {
      id: 'logs',
      name: 'LogsAI',
      status: openIncidents > 0 ? 'degraded' : overallStatus,
      lastUpdated: now,
      lastAction:
        openIncidents > 0
          ? 'Surfacing correlated log patterns'
          : 'No anomalies detected in recent logs',
      insight: commonInsight
    },
    {
      id: 'deploy',
      name: 'DeployAI',
      status: overallStatus,
      lastUpdated: now,
      lastAction: 'Monitoring rollout health and deployment pointers',
      insight:
        summary?.deployments?.length > 0
          ? `Latest deployment: ${summary.deployments[summary.deployments.length - 1]?.version || 'unknown'}`
          : 'No deployments recorded'
    },
    {
      id: 'helpdesk',
      name: 'HelpdeskAI',
      status: helpdesk?.severity === 'high' ? 'degraded' : overallStatus,
      lastUpdated: now,
      lastAction: helpdesk?.issues?.[0] || 'Standing by for diagnostics',
      insight: helpdesk?.recommendations?.[0] || commonInsight
    },
    {
      id: 'l7',
      name: 'L7ReliabilityAI',
      status:
        predictions.healthTrend?.trend === 'down'
          ? 'degraded'
          : overallStatus === 'unknown'
          ? 'healthy'
          : overallStatus,
      lastUpdated: now,
      lastAction:
        predictions.healthTrend?.trend === 'down'
          ? 'Preemptive remediation suggested'
          : 'No reliability risks detected',
      insight:
        predictions.healthTrend &&
        `Health trend ${predictions.healthTrend.trend} (conf ${predictions.healthTrend.confidence})`
    }
  ]

  return base
}
