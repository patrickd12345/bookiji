type Props = {
  bookings: any
  system: any
}

function renderMetric(label: string, value: string) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  )
}

export default function MetricsPanel({ bookings, system }: Props) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>Bookings metrics</div>
        <div className="pill">MetricsAI</div>
      </div>
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {renderMetric('Status', bookings?.message || bookings?.analysis?.status || 'n/a')}
        {renderMetric('Trend', bookings?.analysis?.trend || bookings?.trend || 'steady')}
        {renderMetric('Samples', Array.isArray(bookings?.raw_metrics) ? bookings.raw_metrics.length.toString() : '0')}
        {renderMetric('System points', Array.isArray(system?.raw_metrics) ? system.raw_metrics.length.toString() : '0')}
      </div>
    </div>
  )
}
