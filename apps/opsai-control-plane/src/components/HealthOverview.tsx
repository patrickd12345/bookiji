import type { ControlPlaneOverview, PersonaMode } from '../../../../src/app/api/ops/controlplane/_lib/types'
import { formatSummary } from '../services/personaFormatter'

type Props = {
  overview: ControlPlaneOverview | null
  persona: PersonaMode
  loading: boolean
  error?: string | null
}

export default function HealthOverview({ overview, persona, loading, error }: Props) {
  if (loading) return <div className="card">Loading health...</div>
  if (error) return <div className="card">Error: {error}</div>

  const formatted = formatSummary(
    persona,
    { health: overview?.health },
    overview?.predictions,
    overview?.incidents
  )

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Overall health</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{overview?.health?.overall || 'unknown'}</div>
        </div>
        <div className="pill">
          <span className={`status-dot status-${(overview?.health?.overall || 'unknown').toLowerCase()}`} />
          {overview?.health?.overall || 'unknown'}
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600 }}>{formatted.title}</div>
        <div className="muted" style={{ marginTop: 6 }}>{formatted.body}</div>
        {formatted.bullets && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {formatted.bullets.map((b) => (
              <span key={b} className="pill">{b}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
