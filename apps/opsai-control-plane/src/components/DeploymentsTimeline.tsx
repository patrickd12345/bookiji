import type { DeploymentRecord } from '../../../../src/app/api/ops/controlplane/_lib/types'

type Props = {
  deployments: DeploymentRecord[]
}

export default function DeploymentsTimeline({ deployments }: Props) {
  if (!deployments || deployments.length === 0) {
    return (
      <div className="card">
        <div style={{ fontWeight: 700 }}>Deployments</div>
        <div className="muted" style={{ marginTop: 8 }}>No deployments have been recorded yet.</div>
      </div>
    )
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 700, marginBottom: 12 }}>Deployments</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {deployments.slice(-5).reverse().map((d) => (
          <div key={`${d.id}-${d.startedAt}`} className="panel" style={{ padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>
                {d.service || 'service'} {d.version ? `v${d.version}` : ''}
              </div>
              <div className="pill">
                <span className={`status-dot status-${(d.status || 'unknown').toLowerCase()}`} />
                {d.status || 'unknown'}
              </div>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              Started {d.startedAt ? new Date(d.startedAt).toLocaleString() : 'n/a'} · Completed{' '}
              {d.completedAt ? new Date(d.completedAt).toLocaleString() : 'n/a'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
