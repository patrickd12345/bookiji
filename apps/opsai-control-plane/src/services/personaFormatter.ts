import type { PersonaMode } from '../../../../src/app/api/ops/controlplane/_lib/types'

type SummaryInput = {
  health?: { overall?: string }
  predictions?: {
    healthTrend?: { trend: string; confidence: number }
    bookingsTrend?: { trend: string; confidence: number }
  }
  incidents?: Array<{ title?: string; severity?: string }>
}

export function formatSummary(
  persona: PersonaMode,
  summary: SummaryInput,
  predictions: SummaryInput['predictions'],
  incidents: SummaryInput['incidents'] = []
): { title: string; body: string; bullets?: string[] } {
  const health = summary.health?.overall || 'unknown'
  const latestIncident = incidents[0]
  const incidentBadge = latestIncident
    ? `${latestIncident.title || 'Incident'} (${latestIncident.severity || 'unknown'})`
    : 'No active incidents'

  switch (persona) {
    case 'engineer':
      return {
        title: `Health: ${health} | ${incidentBadge}`,
        body: `Trend: ${predictions?.healthTrend?.trend || 'steady'} (conf ${predictions?.healthTrend?.confidence ?? 0}). Bookings trend: ${predictions?.bookingsTrend?.trend || 'steady'}.`,
        bullets: [
          `Health=${health}`,
          `Incidents=${incidents.length}`,
          `Pred: ${predictions?.healthTrend?.trend || 'n/a'}`
        ]
      }
    case 'manager':
      return {
        title: 'Ops pulse',
        body: `${health} health, ${incidents.length} incident(s). Bookings ${predictions?.bookingsTrend?.trend || 'steady'}.`,
        bullets: [`Risk: ${predictions?.healthTrend?.trend || 'steady'}`, incidentBadge]
      }
    case 'detective':
      return {
        title: 'What looks odd?',
        body: incidents.length
          ? `${incidents.length} anomaly threads open; ${incidentBadge}.`
          : 'No anomalies detected.',
        bullets: [
          `Health shift: ${predictions?.healthTrend?.trend || 'steady'}`,
          `Bookings: ${predictions?.bookingsTrend?.trend || 'steady'}`
        ]
      }
    case 'narrator':
    default:
      return {
        title: 'Story so far',
        body: `The system is ${health}. ${
          incidents.length
            ? `There ${incidents.length === 1 ? 'is' : 'are'} ${incidents.length} active incident${
                incidents.length === 1 ? '' : 's'
              }.`
            : 'No active incidents right now.'
        }`,
        bullets: [
          `Health trend: ${predictions?.healthTrend?.trend || 'steady'}`,
          `Bookings trend: ${predictions?.bookingsTrend?.trend || 'steady'}`
        ]
      }
  }
}
