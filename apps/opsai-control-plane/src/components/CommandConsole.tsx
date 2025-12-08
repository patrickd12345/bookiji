import { useState } from 'react'
import { opsaiClient } from '../services/opsaiClient'
import type { CommandResponse } from '../../../../src/app/api/ops/controlplane/_lib/types'

type HistoryEntry = CommandResponse & { command: string }

export default function CommandConsole() {
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!command.trim()) return
    setRunning(true)
    setError(null)
    try {
      const response = await opsaiClient.command({ command })
      setHistory((prev) => [
        {
          ...response,
          command
        },
        ...prev
      ])
      setCommand('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Command failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>Command Console</div>
        <div className="pill">OPS</div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input
          placeholder="restart api"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          style={{
            flex: 1,
            background: 'var(--panel)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px 12px'
          }}
        />
        <button className="primary" onClick={run} disabled={running}>
          {running ? 'Running...' : 'Send'}
        </button>
      </div>
      {error && <div style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</div>}
      <div style={{ marginTop: 12, maxHeight: 220, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {history.map((h, idx) => (
          <div key={`${h.command}-${idx}`} className="panel" style={{ padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{h.command}</div>
                <div className="muted" style={{ fontSize: 12 }}>{new Date(h.executedAt).toLocaleTimeString()}</div>
              </div>
              <div className="pill" style={{ borderColor: h.accepted ? 'var(--success)' : 'var(--warning)' }}>
                {h.accepted ? 'Accepted' : 'Rejected'}
              </div>
            </div>
            <div style={{ marginTop: 6 }}>{h.message}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
