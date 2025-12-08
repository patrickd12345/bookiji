import type { AgentDescriptor } from '../../../../src/app/api/ops/controlplane/_lib/types'

type Props = {
  agents: AgentDescriptor[]
  onView?: (agent: AgentDescriptor) => void
}

export default function AgentsGrid({ agents, onView }: Props) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>Agents</div>
        <div className="pill">Orchestration</div>
      </div>
      <div
        style={{
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12
        }}
      >
        {agents.map((agent) => (
          <div key={agent.id} className="panel" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>{agent.name}</div>
              <div className="pill">
                <span className={`status-dot status-${agent.status}`} />
                {agent.status}
              </div>
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              Updated {new Date(agent.lastUpdated).toLocaleTimeString()}
            </div>
            <div style={{ marginTop: 8 }}>{agent.lastAction || agent.insight}</div>
            {agent.insight && (
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                {agent.insight}
              </div>
            )}
            {onView && (
              <button className="secondary" style={{ marginTop: 10, width: '100%' }} onClick={() => onView(agent)}>
                View details
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
