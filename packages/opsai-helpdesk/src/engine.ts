export type DiagnosticContext = {
  summary?: {
    deployments?: Array<{ id?: string; status?: string; startedAt?: string }>
    health?: { overall?: string }
  }
  metrics?: {
    bookings?: { baseline?: number; current?: number }
    health?: { trend?: string }
  }
}

export type DiagnosticResult = {
  severity: 'low' | 'medium' | 'high'
  issues: string[]
  recommendations: string[]
  signals: string[]
}

export function diagnose(errorLog: string, context: DiagnosticContext = {}): DiagnosticResult {
  const normalized = (errorLog || '').toLowerCase()
  const issues: string[] = []
  const recommendations: string[] = []
  const signals: string[] = []

  if (normalized.includes('timeout')) {
    issues.push('Request timeouts detected')
    recommendations.push('Increase upstream timeout and check dependency latency')
  }
  if (normalized.includes('database') || normalized.includes('postgres') || normalized.includes('prisma')) {
    issues.push('Database connectivity or query failure')
    recommendations.push('Verify database credentials and run a simple health query')
  }
  if (normalized.includes('econnrefused') || normalized.includes('connection refused')) {
    issues.push('Service connection refused')
    recommendations.push('Ensure target service is reachable and security groups allow traffic')
  }
  if (normalized.includes('ratelimit') || normalized.includes('429')) {
    issues.push('Rate limiting encountered')
    recommendations.push('Apply backoff and confirm downstream quota')
  }

  // Ops context cues
  const stuckDeployments = detectStuckDeployments(context.summary?.deployments || [])
  if (stuckDeployments.length) {
    issues.push(`Stuck deployments: ${stuckDeployments.length} pending > 15m`)
    recommendations.push('Consider resetting deployment pointer or restarting deploy worker')
    signals.push(...stuckDeployments.map((d) => `Deployment ${d.id || 'unknown'} stuck`))
  }

  const health = context.summary?.health?.overall
  if (health && !['green', 'ok', 'healthy'].includes(health.toLowerCase())) {
    issues.push(`Health degraded (${health})`)
    recommendations.push('Page on-call and verify service dashboards')
  }

  const metricsAnomalies = detectAnomalies(context.metrics || {})
  if (metricsAnomalies.issues.length) {
    issues.push(...metricsAnomalies.issues)
    recommendations.push(...metricsAnomalies.recommendations)
    signals.push(...metricsAnomalies.signals)
  }

  let severity: DiagnosticResult['severity'] = 'low'
  if (issues.length > 2) severity = 'medium'
  if (health && ['red', 'critical'].includes(health.toLowerCase())) {
    severity = 'high'
  }

  return {
    severity,
    issues: unique(issues),
    recommendations: unique(recommendations),
    signals: unique(signals)
  }
}

function detectStuckDeployments(
  deployments: Array<{ id?: string; status?: string; startedAt?: string }>
) {
  const now = Date.now()
  return deployments.filter((d) => {
    if (!d.startedAt) return false
    const started = new Date(d.startedAt).getTime()
    const ageMinutes = (now - started) / 60000
    return ageMinutes > 15 && (d.status || '').toLowerCase() === 'pending'
  })
}

export function detectAnomalies(metrics: DiagnosticContext['metrics']) {
  const issues: string[] = []
  const recommendations: string[] = []
  const signals: string[] = []

  const bookings = metrics?.bookings
  if (bookings && bookings.baseline && bookings.current !== undefined) {
    const drop = bookings.current / bookings.baseline
    if (drop < 0.8) {
      issues.push('Booking throughput anomaly detected')
      signals.push(`Bookings dropped to ${(drop * 100).toFixed(1)}% of baseline`)
      recommendations.push('Throttle non-critical jobs and investigate booking pipeline latency')
    }
  }

  if (metrics?.health?.trend === 'down') {
    issues.push('Health trend turning negative')
    recommendations.push('Start proactive restart of fragile components')
  }

  return { issues, recommendations, signals }
}

export function recommendActions(context: DiagnosticContext = {}): string[] {
  const actions = new Set<string>()
  const metrics = context.metrics

  if (metrics?.bookings && metrics.bookings.current !== undefined) {
    actions.add('Enable traffic shaping for booking endpoints')
  }
  if (context.summary?.health && context.summary.health.overall === 'red') {
    actions.add('Escalate to incident commander and open bridge')
  }
  if (detectStuckDeployments(context.summary?.deployments || []).length) {
    actions.add('Reset deployment pointer and trigger redeploy')
  }

  actions.add('Gather last 50 lines of error logs for on-call triage')
  return Array.from(actions)
}

export function analyzeMetrics(metrics: any) {
  // Defensive parsing: metrics may be partial or null
  const healthTrend = metrics?.health?.trend || 'unknown'
  const bookingBaseline = metrics?.bookings?.baseline ?? null
  const bookingCurrent = metrics?.bookings?.current ?? null

  const anomalies = detectAnomalies({
    bookings:
      bookingBaseline != null && bookingCurrent != null
        ? { baseline: bookingBaseline, current: bookingCurrent }
        : undefined,
    health: { trend: healthTrend }
  })

  return {
    trend: healthTrend,
    anomalies: anomalies.issues,
    recommendations: anomalies.recommendations
  }
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}
