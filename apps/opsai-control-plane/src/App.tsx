import { useEffect, useState } from 'react'
import ShellLayout from './layout/ShellLayout'
import HealthOverview from './components/HealthOverview'
import MetricsPanel from './components/MetricsPanel'
import DeploymentsTimeline from './components/DeploymentsTimeline'
import IncidentsList from './components/IncidentsList'
import AgentsGrid from './components/AgentsGrid'
import L7Predictions from './components/L7Predictions'
import TimeMachinePanel from './components/TimeMachinePanel'
import PlaybooksPanel from './components/PlaybooksPanel'
import CommandConsole from './components/CommandConsole'
import VoicePanel from './components/VoicePanel'
import EventStreamStatus from './components/EventStreamStatus'
import { useOpsSummary } from './hooks/useOpsSummary'
import { useMetrics } from './hooks/useMetrics'
import { useDeployments } from './hooks/useDeployments'
import { useIncidents } from './hooks/useIncidents'
import { useEventStream } from './hooks/useEventStream'
import type { PersonaMode, AgentDescriptor } from '../../../src/app/api/ops/controlplane/_lib/types'
import { opsaiClient } from './services/opsaiClient'

export default function App() {
  const [persona, setPersona] = useState<PersonaMode>('engineer')
  const { data: overview, loading, error } = useOpsSummary()
  const metrics = useMetrics(overview)
  const deployments = useDeployments(overview)
  const incidents = useIncidents(overview)
  const { events, status: eventStatus } = useEventStream()
  const [agents, setAgents] = useState<AgentDescriptor[]>(overview?.agents || [])

  useEffect(() => {
    opsaiClient
      .agents()
      .then((res) => setAgents(res.agents))
      .catch(() => {
        if (overview?.agents) setAgents(overview.agents)
      })
  }, [overview?.timestamp])

  return (
    <ShellLayout
      persona={persona}
      onPersonaChange={setPersona}
      eventStatus={<EventStreamStatus status={eventStatus} />}
    >
      <div className="grid" style={{ gap: 16, gridTemplateColumns: '2fr 1fr' }}>
        <HealthOverview overview={overview} persona={persona} loading={loading} error={error} />
        <L7Predictions overview={overview} persona={persona} />
      </div>

      <div className="grid" style={{ gap: 16, gridTemplateColumns: '2fr 1fr' }}>
        <MetricsPanel bookings={metrics.bookings} system={metrics.system} />
        <div className="card">
          <div style={{ fontWeight: 700 }}>Event Stream</div>
          <div style={{ marginTop: 8 }}>
            <EventStreamStatus status={eventStatus} />
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Live updates for health, incidents, deployments, predictions.
          </div>
        </div>
      </div>

      <div className="grid" style={{ gap: 16, gridTemplateColumns: '2fr 1fr' }}>
        <DeploymentsTimeline deployments={deployments} />
        <IncidentsList incidents={incidents} />
      </div>

      <AgentsGrid agents={agents} />

      <div className="grid" style={{ gap: 16, gridTemplateColumns: '1.5fr 1fr 1fr' }}>
        <PlaybooksPanel overview={overview} />
        <TimeMachinePanel />
        <CommandConsole />
      </div>

      <VoicePanel persona="narrator" overview={overview} events={events} />
    </ShellLayout>
  )
}
