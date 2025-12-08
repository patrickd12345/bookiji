import { useState } from 'react'
import { useTimeMachine } from '../hooks/useTimeMachine'

export default function TimeMachinePanel() {
  const [at, setAt] = useState(new Date().toISOString())
  const [from, setFrom] = useState(new Date(Date.now() - 60 * 60 * 1000).toISOString())
  const [to, setTo] = useState(new Date().toISOString())
  const { state, diff, loading, error, viewAt, compare } = useTimeMachine()

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>Time Machine</div>
        <div className="pill">State as of T</div>
      </div>
      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="datetime-local"
            value={at.slice(0, 16)}
            onChange={(e) => setAt(e.target.value)}
            style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}
          />
          <button className="primary" onClick={() => viewAt(at)}>View as of</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="datetime-local"
            value={from.slice(0, 16)}
            onChange={(e) => setFrom(e.target.value)}
            style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}
          />
          <input
            type="datetime-local"
            value={to.slice(0, 16)}
            onChange={(e) => setTo(e.target.value)}
            style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}
          />
          <button className="secondary" onClick={() => compare(from, to)}>Compare</button>
        </div>
      </div>
      {loading && <div style={{ marginTop: 8 }}>Loading...</div>}
      {error && <div style={{ marginTop: 8, color: 'var(--danger)' }}>{error}</div>}
      {state && (
        <div className="panel" style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 600 }}>Snapshot at {state.at}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Health: {state.health?.overall} · Deployments: {state.deployments.length} · Incidents: {state.incidents.length}
          </div>
        </div>
      )}
      {diff && (
        <div className="panel" style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 600 }}>Diff</div>
          <div className="muted">{diff.summary}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            <div className="pill">Health {diff.changes.healthFrom} → {diff.changes.healthTo}</div>
            <div className="pill">Deployments Δ {diff.changes.deploymentsDelta}</div>
            <div className="pill">Incidents Δ {diff.changes.incidentsDelta}</div>
          </div>
        </div>
      )}
    </div>
  )
}
