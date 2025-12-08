import { detectMetricShift, predictHealthTrend } from './predict'

export type Incident = {
  id: string
  severity: 'low' | 'medium' | 'high'
  title: string
  status: 'open' | 'closed'
  createdAt: string
  cause: string
}

export type ReliabilityContext = {
  healthScores?: number[]
  bookingCurrent?: number
  bookingBaseline?: number
  anomalies?: string[]
}

export function autoGenerateIncidents(context: ReliabilityContext): Incident[] {
  const incidents: Incident[] = []
  const healthPrediction = predictHealthTrend(context.healthScores || [])

  if (healthPrediction.trend === 'down' && (context.healthScores?.slice(-1)[0] ?? 1) < 0.5) {
    incidents.push(makeIncident('high', 'Health degradation detected', 'Health score falling'))
  }

  if (context.bookingCurrent != null && context.bookingBaseline != null) {
    const shift = detectMetricShift(context.bookingCurrent, context.bookingBaseline)
    if (shift.severity !== 'low') {
      incidents.push(
        makeIncident(
          shift.severity === 'high' ? 'high' : 'medium',
          'Booking throughput deviation',
          `Bookings ${(shift.shift * 100).toFixed(1)}% vs baseline`
        )
      )
    }
  }

  if (context.anomalies?.length) {
    incidents.push(
      makeIncident('medium', 'Anomalies detected', context.anomalies.join('; '))
    )
  }

  return incidents
}

function makeIncident(severity: Incident['severity'], title: string, cause: string): Incident {
  return {
    id: `inc_${Math.random().toString(16).slice(2)}_${Date.now()}`,
    severity,
    title,
    status: 'open',
    createdAt: new Date().toISOString(),
    cause
  }
}
