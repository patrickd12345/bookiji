type Props = {
  status: 'connecting' | 'open' | 'closed'
}

export default function EventStreamStatus({ status }: Props) {
  const color =
    status === 'open'
      ? 'var(--success)'
      : status === 'connecting'
      ? 'var(--warning)'
      : 'var(--danger)'
  const label =
    status === 'open' ? 'Event stream: live' : status === 'connecting' ? 'Event stream: connecting' : 'Event stream: offline'

  return (
    <div className="pill" style={{ borderColor: color, color }}>
      <span className="status-dot" style={{ background: color }} />
      {label}
    </div>
  )
}
