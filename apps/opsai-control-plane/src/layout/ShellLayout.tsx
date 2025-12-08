import { ReactNode } from 'react'
import type { PersonaMode } from '../../../../src/app/api/ops/controlplane/_lib/types'

type Props = {
  persona: PersonaMode
  onPersonaChange: (persona: PersonaMode) => void
  eventStatus?: ReactNode
  children: ReactNode
}

export default function ShellLayout({ persona, onPersonaChange, eventStatus, children }: Props) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          background: 'rgba(11,18,32,0.9)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border)',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontWeight: 700, letterSpacing: 0.6 }}>OpsAI Control Plane</div>
          <div className="pill">Unified</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {eventStatus}
          <select
            value={persona}
            onChange={(e) => onPersonaChange(e.target.value as PersonaMode)}
            style={{
              background: 'var(--card)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 10px'
            }}
          >
            <option value="engineer">Engineer</option>
            <option value="manager">Manager</option>
            <option value="detective">Detective</option>
            <option value="narrator">Narrator</option>
          </select>
        </div>
      </header>
      <main style={{ flex: 1, padding: '18px 24px 32px', display: 'grid', gap: 16 }}>
        {children}
      </main>
    </div>
  )
}
