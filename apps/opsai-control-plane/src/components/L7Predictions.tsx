import type { ControlPlaneOverview, PersonaMode } from '../../../../src/app/api/ops/controlplane/_lib/types'
import { formatSummary } from '../services/personaFormatter'

type Props = {
  overview: ControlPlaneOverview | null
  persona: PersonaMode
}

export default function L7Predictions({ overview, persona }: Props) {
  const formatted = formatSummary(persona, { health: overview?.health }, overview?.predictions, overview?.incidents)

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>L7 Reliability</div>
        <div className="pill">L7</div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 600 }}>{formatted.title}</div>
        <div className="muted" style={{ marginTop: 4 }}>{formatted.body}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <div className="pill">
            Health trend: {overview?.predictions?.healthTrend?.trend || 'steady'} (conf {overview?.predictions?.healthTrend?.confidence ?? 0})
          </div>
          <div className="pill">
            Bookings trend: {overview?.predictions?.bookingsTrend?.trend || 'steady'}
          </div>
        </div>
      </div>
    </div>
  )
}
