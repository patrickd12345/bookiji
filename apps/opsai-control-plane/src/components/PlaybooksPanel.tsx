import { useEffect, useState } from 'react'
import type { ControlPlaneOverview, Playbook, EvaluatedPlaybook } from '../../../../src/app/api/ops/controlplane/_lib/types'
import { opsaiClient } from '../services/opsaiClient'

type Props = {
  overview: ControlPlaneOverview | null
}

export default function PlaybooksPanel({ overview }: Props) {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [evaluated, setEvaluated] = useState<EvaluatedPlaybook[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    opsaiClient
      .playbooks()
      .then((res) => setPlaybooks(res.playbooks))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load playbooks'))
  }, [])

  useEffect(() => {
    if (!overview) return
    opsaiClient
      .evaluatePlaybooks({
        health: overview.health?.overall,
        metrics: overview.metrics,
        incidents: overview.incidents
      })
      .then((res) => setEvaluated(res.playbooks))
      .catch(() => {
        // ignore evaluation errors to keep UI usable
      })
  }, [overview])

  const merged = evaluated.length ? evaluated : playbooks.map((p) => ({ ...p, hot: false }))

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>Playbooks</div>
        <div className="pill">{merged.length}</div>
      </div>
      {error && <div style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
        {merged.map((p) => (
          <div key={p.id} className="panel" style={{ borderColor: p.hot ? 'var(--accent)' : 'var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              {p.hot && <div className="pill" style={{ borderColor: 'var(--accent)' }}>Hot</div>}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>{p.description}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {p.steps.map((step) => (
                <span key={step.id} className="pill">{step.label}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
