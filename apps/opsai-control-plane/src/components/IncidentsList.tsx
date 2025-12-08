import type { Incident } from '../../../../src/types/incidents'

type Props = {
  incidents: Incident[]
}

export default function IncidentsList({ incidents }: Props) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>Incidents</div>
        <div className="pill">{incidents.length} open</div>
      </div>
      {incidents.length === 0 && <div className="muted" style={{ marginTop: 8 }}>No incidents detected.</div>}
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {incidents.map((incident) => (
          <div key={incident.id} className="panel" style={{ padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>{incident.title}</div>
              <div className="pill" style={{ borderColor: 'var(--warning)' }}>
                <span className="status-dot status-degraded" />
                {incident.severity}
              </div>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {incident.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
