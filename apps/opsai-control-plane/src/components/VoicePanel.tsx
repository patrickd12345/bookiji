import { useMemo, useState } from 'react'
import type { ControlPlaneOverview, ControlPlaneEvent, PersonaMode } from '../../../../src/app/api/ops/controlplane/_lib/types'
import { formatSummary } from '../services/personaFormatter'

type Props = {
  persona: PersonaMode
  overview: ControlPlaneOverview | null
  events: ControlPlaneEvent[]
}

export default function VoicePanel({ persona, overview, events }: Props) {
  const [lastSpoken, setLastSpoken] = useState<string | null>(null)
  const summary = useMemo(
    () => formatSummary(persona, { health: overview?.health }, overview?.predictions, overview?.incidents),
    [persona, overview]
  )

  const speak = (text: string) => {
    setLastSpoken(text)
    // Voice abstraction: in a future phase this would call window.speechSynthesis or @bookiji/opsai-voice
    console.debug('Voice:', text)
  }

  const recentEvents = events.slice(-5)

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>Voice Console</div>
        <div className="pill">Narrator</div>
      </div>
      <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
        Uses narrator persona text; replace with speech synthesis when available.
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button className="primary" onClick={() => speak(summary.body)}>Read latest summary</button>
        <button
          className="secondary"
          onClick={() => speak(`Changes: ${recentEvents.map((e) => e.message).join('; ') || 'no changes last 5 minutes'}`)}
        >
          Announce changes (5m)
        </button>
      </div>
      {lastSpoken && (
        <div className="panel" style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 600 }}>Last spoken</div>
          <div className="muted" style={{ fontSize: 12 }}>{lastSpoken}</div>
        </div>
      )}
    </div>
  )
}
