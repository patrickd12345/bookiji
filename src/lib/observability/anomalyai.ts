/**
 * AnomalyAI - Cross-domain anomaly detection specialist for Bookiji
 * 
 * Agent 8: General anomaly detector across all signals
 * 
 * Responsibilities:
 * - Watch for sudden changes across ANY metric or health indicator
 * - Combine signals into unified anomaly reports
 * - Prioritize severity
 * - Recommend who (which agent) should investigate
 * 
 * Scope:
 * - ALL read-only endpoints from metrics, health, logs, incidents, SLOs
 * 
 * Output style:
 * - Cross-agent awareness
 * - Early-warning system
 * - Escalate only when meaningful
 */

export interface AnomalySignal {
  source: 'health' | 'metrics' | 'slo' | 'incidents' | 'events' | 'logs'
  endpoint: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: string
  description: string
  timestamp: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  baseline?: any
  deviation?: number
  affectedServices?: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
}

export interface UnifiedAnomaly {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  detectedAt: string
  signals: AnomalySignal[]
  affectedServices: string[]
  recommendedAgent: 'HealthAI' | 'SLOAI' | 'MetricsAI' | 'IncidentsAI' | 'AnomalyAI'
  recommendedAction: string
  confidence: number // 0-1
  correlationScore?: number // How many signals correlate
}

export interface AnomalyReport {
  timestamp: string
  totalAnomalies: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  anomalies: UnifiedAnomaly[]
  summary: string
  recommendations: {
    immediate: string[]
    monitor: string[]
    investigate: Array<{
      agent: string
      reason: string
      priority: number
    }>
  }
  crossSignalCorrelations: Array<{
    signals: string[]
    pattern: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }>
}

export class AnomalyAI {
  private static readonly SEVERITY_WEIGHTS = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  }

  private static readonly ANOMALY_THRESHOLDS = {
    // Percentage change thresholds
    suddenChange: 0.5, // 50% change
    significantChange: 0.25, // 25% change
    moderateChange: 0.10, // 10% change
    
    // Absolute thresholds
    errorRateCritical: 0.05, // 5% error rate
    errorRateHigh: 0.02, // 2% error rate
    latencySpike: 2.0, // 2x latency increase
    healthDegradation: 0.3, // 30% subsystem degradation
    
    // Log thresholds
    logVolumeSpike: 3.0, // 3x log volume increase
    logVolumeHigh: 100, // 100+ logs in time window
    criticalLogThreshold: 10, // 10+ critical logs
    errorLogThreshold: 50, // 50+ error logs
    
    // Event thresholds
    eventVolumeSpike: 2.0, // 2x event volume increase
    criticalEventThreshold: 5, // 5+ critical events
  }

  /**
   * Detect anomalies from health signals
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static detectHealthAnomalies(healthData: any): AnomalySignal[] {
    const anomalies: AnomalySignal[] = []
    const timestamp = new Date().toISOString()

    if (!healthData || !healthData.subsystems) {
      return anomalies
    }

    // Check overall health
    if (healthData.status === 'unhealthy') {
      anomalies.push({
        source: 'health',
        endpoint: '/api/ops/health',
        severity: 'critical',
        type: 'system_unhealthy',
        description: 'Overall system health is unhealthy',
        timestamp,
        value: healthData.status,
        affectedServices: Object.keys(healthData.subsystems || {})
      })
    } else if (healthData.status === 'degraded') {
      anomalies.push({
        source: 'health',
        endpoint: '/api/ops/health',
        severity: 'high',
        type: 'system_degraded',
        description: 'Overall system health is degraded',
        timestamp,
        value: healthData.status
      })
    }

    // Check individual subsystems
    const subsystems = healthData.subsystems || {}
    for (const [subsystem, data] of Object.entries(subsystems)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subData = data as any
      if (subData.status === 'unhealthy') {
        anomalies.push({
          source: 'health',
          endpoint: `/api/ops/health/${subsystem}`,
          severity: 'critical',
          type: 'subsystem_unhealthy',
          description: `${subsystem} subsystem is unhealthy`,
          timestamp,
          value: subData,
          affectedServices: [subsystem]
        })
      } else if (subData.status === 'degraded') {
        anomalies.push({
          source: 'health',
          endpoint: `/api/ops/health/${subsystem}`,
          severity: 'high',
          type: 'subsystem_degraded',
          description: `${subsystem} subsystem is degraded`,
          timestamp,
          value: subData
        })
      }
    }

    return anomalies
  }

  /**
   * Detect anomalies from metrics signals
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static detectMetricsAnomalies(metricsData: any, endpoint: string): AnomalySignal[] {
    const anomalies: AnomalySignal[] = []
    const timestamp = new Date().toISOString()

    if (!metricsData) {
      return anomalies
    }

    // Error rate anomalies
    if (metricsData.analysis?.error_rate) {
      const errorRate = metricsData.analysis.error_rate.current
      if (errorRate >= this.ANOMALY_THRESHOLDS.errorRateCritical) {
        anomalies.push({
          source: 'metrics',
          endpoint,
          severity: 'critical',
          type: 'error_rate_spike',
          description: `Error rate is critically high: ${(errorRate * 100).toFixed(2)}%`,
          timestamp,
          value: errorRate,
          baseline: metricsData.analysis.error_rate.previous,
          deviation: metricsData.analysis.error_rate.previous 
            ? ((errorRate - metricsData.analysis.error_rate.previous) / metricsData.analysis.error_rate.previous) * 100
            : undefined
        })
      } else if (errorRate >= this.ANOMALY_THRESHOLDS.errorRateHigh) {
        anomalies.push({
          source: 'metrics',
          endpoint,
          severity: 'high',
          type: 'error_rate_elevated',
          description: `Error rate is elevated: ${(errorRate * 100).toFixed(2)}%`,
          timestamp,
          value: errorRate
        })
      }
    }

    // Latency anomalies
    if (metricsData.analysis?.latency) {
      const latency = metricsData.analysis.latency
      if (latency.p95 && latency.p95_previous) {
        const increase = (latency.p95 - latency.p95_previous) / latency.p95_previous
        if (increase >= this.ANOMALY_THRESHOLDS.latencySpike - 1) {
          anomalies.push({
            source: 'metrics',
            endpoint,
            severity: 'critical',
            type: 'latency_spike',
            description: `P95 latency increased by ${(increase * 100).toFixed(1)}%`,
            timestamp,
            value: latency.p95,
            baseline: latency.p95_previous,
            deviation: increase * 100
          })
        } else if (increase >= 0.5) {
          anomalies.push({
            source: 'metrics',
            endpoint,
            severity: 'high',
            type: 'latency_increase',
            description: `P95 latency increased by ${(increase * 100).toFixed(1)}%`,
            timestamp,
            value: latency.p95,
            baseline: latency.p95_previous
          })
        }
      }
    }

    // System metrics anomalies
    if (metricsData.analysis?.system) {
      const system = metricsData.analysis.system
      if (system.cpu_percent && system.cpu_percent > 90) {
        anomalies.push({
          source: 'metrics',
          endpoint,
          severity: 'high',
          type: 'cpu_high',
          description: `CPU usage is high: ${system.cpu_percent.toFixed(1)}%`,
          timestamp,
          value: system.cpu_percent
        })
      }
      if (system.memory_percent && system.memory_percent > 90) {
        anomalies.push({
          source: 'metrics',
          endpoint,
          severity: 'high',
          type: 'memory_high',
          description: `Memory usage is high: ${system.memory_percent.toFixed(1)}%`,
          timestamp,
          value: system.memory_percent
        })
      }
    }

    return anomalies
  }

  /**
   * Detect anomalies from SLO signals
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static detectSLOAnomalies(sloData: any): AnomalySignal[] {
    const anomalies: AnomalySignal[] = []
    const timestamp = new Date().toISOString()

    if (!sloData) {
      return anomalies
    }

    // Check overall SLO status
    if (sloData.status?.riskLevel === 'critical') {
      anomalies.push({
        source: 'slo',
        endpoint: '/api/ops/slo/status',
        severity: 'critical',
        type: 'slo_critical',
        description: 'SLO risk level is critical',
        timestamp,
        value: sloData.status,
        metadata: {
          criticalViolations: sloData.status.criticalViolations,
          insideBudget: sloData.status.insideBudget
        }
      })
    } else if (sloData.status?.riskLevel === 'high') {
      anomalies.push({
        source: 'slo',
        endpoint: '/api/ops/slo/status',
        severity: 'high',
        type: 'slo_high_risk',
        description: 'SLO risk level is high',
        timestamp,
        value: sloData.status
      })
    }

    // Check error budget
    if (sloData.errorBudget) {
      const budget = sloData.errorBudget
      if (budget.remaining <= 0) {
        anomalies.push({
          source: 'slo',
          endpoint: '/api/ops/slo/status',
          severity: 'critical',
          type: 'error_budget_exhausted',
          description: 'Error budget has been exhausted',
          timestamp,
          value: budget
        })
      } else if (budget.timeToExhaustionHours && budget.timeToExhaustionHours < 24) {
        anomalies.push({
          source: 'slo',
          endpoint: '/api/ops/slo/status',
          severity: 'high',
          type: 'error_budget_low',
          description: `Error budget will be exhausted in ${budget.timeToExhaustionHours.toFixed(1)} hours`,
          timestamp,
          value: budget
        })
      }
    }

    return anomalies
  }

  /**
   * Detect anomalies from incidents signals
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static detectIncidentAnomalies(incidentsData: any): AnomalySignal[] {
    const anomalies: AnomalySignal[] = []
    const timestamp = new Date().toISOString()

    if (!incidentsData || !incidentsData.data) {
      return anomalies
    }

    const data = incidentsData.data

    // Check for critical incidents
    if (data.criticalCount > 0) {
      anomalies.push({
        source: 'incidents',
        endpoint: '/api/ops/incidents/ai-triage',
        severity: 'critical',
        type: 'critical_incidents',
        description: `${data.criticalCount} critical incident(s) open`,
        timestamp,
        value: data.criticalCount,
        metadata: {
          openIncidents: data.openIncidentsCount,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          summaries: data.summaries?.filter((s: any) => s.severity === 'critical') || []
        }
      })
    }

    // Check for high severity incidents
    if (data.highCount > 0 && data.criticalCount === 0) {
      anomalies.push({
        source: 'incidents',
        endpoint: '/api/ops/incidents/ai-triage',
        severity: 'high',
        type: 'high_incidents',
        description: `${data.highCount} high severity incident(s) open`,
        timestamp,
        value: data.highCount
      })
    }

    // Check for sudden increase in incidents
    if (data.openIncidentsCount > 5) {
      anomalies.push({
        source: 'incidents',
        endpoint: '/api/ops/incidents/ai-triage',
        severity: 'medium',
        type: 'incident_volume',
        description: `High volume of open incidents: ${data.openIncidentsCount}`,
        timestamp,
        value: data.openIncidentsCount
      })
    }

    return anomalies
  }

  /**
   * Detect anomalies from log signals
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static detectLogAnomalies(logData: any, endpoint: string): AnomalySignal[] {
    const anomalies: AnomalySignal[] = []
    const timestamp = new Date().toISOString()

    if (!logData || !logData.data) {
      return anomalies
    }

    const data = logData.data

    // Error log anomalies
    if (endpoint.includes('/logs/errors')) {
      const errorCount = data.errorCount || 0
      const criticalCount = data.criticalCount || 0
      const totalLogs = data.totalLogs || 0

      // Critical log volume
      if (criticalCount >= this.ANOMALY_THRESHOLDS.criticalLogThreshold) {
        anomalies.push({
          source: 'logs',
          endpoint,
          severity: 'critical',
          type: 'critical_log_spike',
          description: `${criticalCount} critical log entries detected`,
          timestamp,
          value: criticalCount,
          metadata: {
            totalLogs,
            errorCount,
            topErrors: data.topErrors?.slice(0, 5) || []
          }
        })
      }

      // Error log volume spike
      if (errorCount >= this.ANOMALY_THRESHOLDS.errorLogThreshold) {
        anomalies.push({
          source: 'logs',
          endpoint,
          severity: errorCount >= this.ANOMALY_THRESHOLDS.errorLogThreshold * 2 ? 'critical' : 'high',
          type: 'error_log_volume',
          description: `${errorCount} error log entries detected`,
          timestamp,
          value: errorCount,
          metadata: {
            totalLogs,
            criticalCount
          }
        })
      }

      // New error patterns detected
      if (data.newPatterns && data.newPatterns.length > 0) {
        anomalies.push({
          source: 'logs',
          endpoint,
          severity: data.newPatterns.length > 3 ? 'high' : 'medium',
          type: 'new_error_patterns',
          description: `${data.newPatterns.length} new error pattern(s) detected`,
          timestamp,
          value: data.newPatterns.length,
          metadata: {
            patterns: data.newPatterns.slice(0, 3)
          }
        })
      }

      // Regressions detected
      if (data.regressions && data.regressions.length > 0) {
        anomalies.push({
          source: 'logs',
          endpoint,
          severity: 'high',
          type: 'error_regression',
          description: `${data.regressions.length} error regression(s) detected`,
          timestamp,
          value: data.regressions.length,
          metadata: {
            regressions: data.regressions.slice(0, 3)
          }
        })
      }
    }

    // System log anomalies
    if (endpoint.includes('/logs/system')) {
      const totalLogs = data.totalLogs || 0
      const warningCount = data.warningCount || 0

      // System log volume spike
      if (totalLogs >= this.ANOMALY_THRESHOLDS.logVolumeHigh) {
        anomalies.push({
          source: 'logs',
          endpoint,
          severity: totalLogs >= this.ANOMALY_THRESHOLDS.logVolumeHigh * 2 ? 'high' : 'medium',
          type: 'system_log_volume',
          description: `High system log volume: ${totalLogs} entries`,
          timestamp,
          value: totalLogs,
          metadata: {
            warningCount
          }
        })
      }

      // New patterns in system logs
      if (data.newPatterns && data.newPatterns.length > 2) {
        anomalies.push({
          source: 'logs',
          endpoint,
          severity: 'medium',
          type: 'system_log_patterns',
          description: `${data.newPatterns.length} new system log pattern(s) detected`,
          timestamp,
          value: data.newPatterns.length
        })
      }
    }

    // Booking log anomalies
    if (endpoint.includes('/logs/booking')) {
      const totalLogs = data.totalLogs || 0
      const errorCount = data.errorCount || 0

      // Booking log errors
      if (errorCount > 0) {
        const errorRate = totalLogs > 0 ? errorCount / totalLogs : 0
        if (errorRate >= this.ANOMALY_THRESHOLDS.errorRateHigh) {
          anomalies.push({
            source: 'logs',
            endpoint,
            severity: errorRate >= this.ANOMALY_THRESHOLDS.errorRateCritical ? 'critical' : 'high',
            type: 'booking_log_errors',
            description: `High error rate in booking logs: ${(errorRate * 100).toFixed(2)}%`,
            timestamp,
            value: errorRate,
            metadata: {
              errorCount,
              totalLogs
            }
          })
        }
      }
    }

    return anomalies
  }

  /**
   * Detect anomalies from event signals
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static detectEventAnomalies(eventsData: any, endpoint: string): AnomalySignal[] {
    const anomalies: AnomalySignal[] = []
    const timestamp = new Date().toISOString()

    if (!eventsData || !eventsData.data) {
      return anomalies
    }

    const events = Array.isArray(eventsData.data) ? eventsData.data : []
    const eventCount = events.length

    // Critical events detected
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const criticalEvents = events.filter((e: any) => e.severity === 'critical' || e.severity === 'error')
    if (criticalEvents.length >= this.ANOMALY_THRESHOLDS.criticalEventThreshold) {
      anomalies.push({
        source: 'events',
        endpoint,
        severity: 'critical',
        type: 'critical_events_spike',
        description: `${criticalEvents.length} critical event(s) detected`,
        timestamp,
        value: criticalEvents.length,
        metadata: {
          totalEvents: eventCount,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          criticalEvents: criticalEvents.slice(0, 5).map((e: any) => ({
            type: e.type,
            title: e.title,
            timestamp: e.timestamp
          }))
        }
      })
    }

    // High event volume
    if (eventCount >= 50) {
      anomalies.push({
        source: 'events',
        endpoint,
        severity: eventCount >= 100 ? 'high' : 'medium',
        type: 'event_volume_spike',
        description: `High event volume: ${eventCount} events`,
        timestamp,
        value: eventCount
      })
    }

    // Deployment-related events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deployEvents = events.filter((e: any) => 
      e.type === 'deploy' || 
      e.type === 'deployment' ||
      (e.title && e.title.toLowerCase().includes('deploy'))
    )
    if (deployEvents.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const failedDeploys = deployEvents.filter((e: any) => 
        e.severity === 'error' || 
        e.severity === 'critical' ||
        (e.data && e.data.status === 'failed')
      )
      if (failedDeploys.length > 0) {
        anomalies.push({
          source: 'events',
          endpoint,
          severity: 'high',
          type: 'deployment_failures',
          description: `${failedDeploys.length} failed deployment(s) detected`,
          timestamp,
          value: failedDeploys.length,
          metadata: {
            deployments: failedDeploys.slice(0, 3)
          }
        })
      }
    }

    // Health check events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const healthEvents = events.filter((e: any) => 
      e.type === 'health-check' || 
      (e.title && e.title.toLowerCase().includes('health'))
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const failedHealthChecks = healthEvents.filter((e: any) => 
      e.severity === 'error' || e.severity === 'critical'
    )
    if (failedHealthChecks.length >= 3) {
      anomalies.push({
        source: 'events',
        endpoint,
        severity: 'high',
        type: 'health_check_failures',
        description: `${failedHealthChecks.length} health check failure(s) detected`,
        timestamp,
        value: failedHealthChecks.length,
        affectedServices: failedHealthChecks
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((e: any) => e.service)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((s: any) => s)
          .slice(0, 5)
      })
    }

    return anomalies
  }

  /**
   * Unify and correlate anomalies into a single report
   */
  static unifyAnomalies(signals: AnomalySignal[]): UnifiedAnomaly[] {
    if (signals.length === 0) {
      return []
    }

    // Group signals by type and affected services
    const grouped = new Map<string, AnomalySignal[]>()
    
    for (const signal of signals) {
      const key = `${signal.type}:${(signal.affectedServices || []).join(',')}`
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(signal)
    }

    const unified: UnifiedAnomaly[] = []

    for (const [_key, groupSignals] of grouped.entries()) {
      // Determine overall severity (highest in group)
      const severities = groupSignals.map(s => s.severity)
      const severityOrder = ['critical', 'high', 'medium', 'low']
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const maxSeverity = severityOrder.find(s => severities.includes(s as any)) || 'low'

      // Collect all affected services
      const affectedServices = new Set<string>()
      groupSignals.forEach(s => {
        s.affectedServices?.forEach(service => affectedServices.add(service))
      })

      // Determine recommended agent
      const recommendedAgent = this.recommendAgent(groupSignals)

      // Calculate confidence based on signal count and correlation
      const confidence = Math.min(1.0, 0.5 + (groupSignals.length * 0.15))

      // Generate title and description
      const title = this.generateAnomalyTitle(groupSignals[0], groupSignals.length)
      const description = this.generateAnomalyDescription(groupSignals)

      unified.push({
        id: `${groupSignals[0].type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        severity: maxSeverity as any,
        title,
        description,
        detectedAt: new Date().toISOString(),
        signals: groupSignals,
        affectedServices: Array.from(affectedServices),
        recommendedAgent,
        recommendedAction: this.generateRecommendedAction(groupSignals, recommendedAgent),
        confidence,
        correlationScore: groupSignals.length > 1 ? groupSignals.length : undefined
      })
    }

    // Sort by severity (critical first)
    unified.sort((a, b) => {
      return this.SEVERITY_WEIGHTS[b.severity] - this.SEVERITY_WEIGHTS[a.severity]
    })

    return unified
  }

  /**
   * Recommend which agent should investigate
   */
  private static recommendAgent(signals: AnomalySignal[]): 'HealthAI' | 'SLOAI' | 'MetricsAI' | 'IncidentsAI' | 'AnomalyAI' {
    // Count signals by source
    const sourceCounts = new Map<string, number>()
    signals.forEach(s => {
      sourceCounts.set(s.source, (sourceCounts.get(s.source) || 0) + 1)
    })

    // Priority: incidents > slo > health > logs > events > metrics
    if (sourceCounts.get('incidents') || signals.some(s => s.type.includes('incident'))) {
      return 'IncidentsAI'
    }
    if (sourceCounts.get('slo') || signals.some(s => s.type.includes('slo') || s.type.includes('error_budget'))) {
      return 'SLOAI'
    }
    if (sourceCounts.get('health') || signals.some(s => s.type.includes('health') || s.type.includes('subsystem'))) {
      return 'HealthAI'
    }
    if (sourceCounts.get('logs') || signals.some(s => s.type.includes('log') || s.type.includes('error_pattern'))) {
      return 'MetricsAI' // Logs are typically analyzed by MetricsAI
    }
    if (sourceCounts.get('events') || signals.some(s => s.type.includes('event') || s.type.includes('deployment'))) {
      return 'AnomalyAI' // Events are cross-domain, AnomalyAI handles them
    }
    if (sourceCounts.get('metrics') || signals.some(s => s.type.includes('error_rate') || s.type.includes('latency'))) {
      return 'MetricsAI'
    }

    return 'AnomalyAI'
  }

  /**
   * Generate anomaly title
   */
  private static generateAnomalyTitle(signal: AnomalySignal, signalCount: number): string {
    const countSuffix = signalCount > 1 ? ` (${signalCount} signals)` : ''
    
    switch (signal.type) {
      case 'system_unhealthy':
        return `System Health Critical${countSuffix}`
      case 'subsystem_unhealthy':
        return `${signal.affectedServices?.[0] || 'Subsystem'} Unhealthy${countSuffix}`
      case 'error_rate_spike':
        return `Error Rate Spike${countSuffix}`
      case 'latency_spike':
        return `Latency Spike${countSuffix}`
      case 'slo_critical':
        return `SLO Critical Violation${countSuffix}`
      case 'error_budget_exhausted':
        return `Error Budget Exhausted${countSuffix}`
      case 'critical_incidents':
        return `Critical Incidents Detected${countSuffix}`
      case 'critical_log_spike':
        return `Critical Log Spike${countSuffix}`
      case 'error_log_volume':
        return `Error Log Volume Spike${countSuffix}`
      case 'new_error_patterns':
        return `New Error Patterns${countSuffix}`
      case 'error_regression':
        return `Error Regression${countSuffix}`
      case 'critical_events_spike':
        return `Critical Events Spike${countSuffix}`
      case 'deployment_failures':
        return `Deployment Failures${countSuffix}`
      case 'health_check_failures':
        return `Health Check Failures${countSuffix}`
      default:
        return `${signal.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}${countSuffix}`
    }
  }

  /**
   * Generate anomaly description
   */
  private static generateAnomalyDescription(signals: AnomalySignal[]): string {
    if (signals.length === 1) {
      return signals[0].description
    }

    const descriptions = signals.map(s => s.description)
    return `Multiple related anomalies detected: ${descriptions.join('; ')}`
  }

  /**
   * Generate recommended action
   */
  private static generateRecommendedAction(signals: AnomalySignal[], agent: string): string {
    const signal = signals[0]
    
    switch (agent) {
      case 'HealthAI':
        return `Investigate subsystem health issues. Check ${signal.affectedServices?.join(', ') || 'affected services'}`
      case 'SLOAI':
        return `Review SLO compliance and error budget status. Assess customer impact.`
      case 'MetricsAI':
        return `Analyze metrics trends and identify root cause of ${signal.type.replace(/_/g, ' ')}`
      case 'IncidentsAI':
        return `Review incident triage summary and prioritize critical incidents`
      default:
        if (signal.source === 'logs') {
          return `Analyze log patterns and identify root cause of ${signal.type.replace(/_/g, ' ')}`
        }
        if (signal.source === 'events') {
          return `Review event patterns and correlate with system changes`
        }
        return `Monitor and investigate ${signal.type} anomaly`
    }
  }

  /**
   * Generate comprehensive anomaly report
   */
  static generateReport(unifiedAnomalies: UnifiedAnomaly[]): AnomalyReport {
    const timestamp = new Date().toISOString()
    
    // Count by severity
    const criticalCount = unifiedAnomalies.filter(a => a.severity === 'critical').length
    const highCount = unifiedAnomalies.filter(a => a.severity === 'high').length
    const mediumCount = unifiedAnomalies.filter(a => a.severity === 'medium').length
    const lowCount = unifiedAnomalies.filter(a => a.severity === 'low').length

    // Generate summary
    let summary = 'No anomalies detected.'
    if (unifiedAnomalies.length > 0) {
      if (criticalCount > 0) {
        summary = `🚨 ${criticalCount} critical anomaly(ies) detected requiring immediate attention.`
      } else if (highCount > 0) {
        summary = `⚠️ ${highCount} high-severity anomaly(ies) detected.`
      } else if (mediumCount > 0) {
        summary = `📊 ${mediumCount} medium-severity anomaly(ies) detected.`
      } else {
        summary = `ℹ️ ${lowCount} low-severity anomaly(ies) detected.`
      }
    }

    // Generate recommendations
    const immediate: string[] = []
    const monitor: string[] = []
    const investigate: Array<{ agent: string; reason: string; priority: number }> = []

    const agentPriorities = new Map<string, { count: number; maxSeverity: string; reasons: string[] }>()

    for (const anomaly of unifiedAnomalies) {
      if (anomaly.severity === 'critical') {
        immediate.push(anomaly.recommendedAction)
      } else if (anomaly.severity === 'high') {
        monitor.push(anomaly.recommendedAction)
      }

      const agent = anomaly.recommendedAgent
      if (!agentPriorities.has(agent)) {
        agentPriorities.set(agent, {
          count: 0,
          maxSeverity: anomaly.severity,
          reasons: []
        })
      }

      const agentData = agentPriorities.get(agent)!
      agentData.count++
      if (this.SEVERITY_WEIGHTS[anomaly.severity as keyof typeof this.SEVERITY_WEIGHTS] > 
          this.SEVERITY_WEIGHTS[agentData.maxSeverity as keyof typeof this.SEVERITY_WEIGHTS]) {
        agentData.maxSeverity = anomaly.severity
      }
      agentData.reasons.push(anomaly.title)
    }

    // Convert agent priorities to investigate list
    for (const [agent, data] of agentPriorities.entries()) {
      investigate.push({
        agent,
        reason: `${data.count} anomaly(ies): ${data.reasons.slice(0, 2).join(', ')}`,
        priority: this.SEVERITY_WEIGHTS[data.maxSeverity as keyof typeof this.SEVERITY_WEIGHTS]
      })
    }

    // Sort investigate by priority
    investigate.sort((a, b) => b.priority - a.priority)

    // Find cross-signal correlations
    const correlations = this.findCorrelations(unifiedAnomalies)

    return {
      timestamp,
      totalAnomalies: unifiedAnomalies.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      anomalies: unifiedAnomalies,
      summary,
      recommendations: {
        immediate,
        monitor,
        investigate
      },
      crossSignalCorrelations: correlations
    }
  }

  /**
   * Find correlations between anomalies
   */
  private static findCorrelations(anomalies: UnifiedAnomaly[]): Array<{
    signals: string[]
    pattern: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }> {
    const correlations: Array<{
      signals: string[]
      pattern: string
      severity: 'low' | 'medium' | 'high' | 'critical'
    }> = []

    // Group by affected services
    const serviceGroups = new Map<string, UnifiedAnomaly[]>()
    for (const anomaly of anomalies) {
      for (const service of anomaly.affectedServices) {
        if (!serviceGroups.has(service)) {
          serviceGroups.set(service, [])
        }
        serviceGroups.get(service)!.push(anomaly)
      }
    }

    // Find services with multiple anomalies
    for (const [service, serviceAnomalies] of serviceGroups.entries()) {
      if (serviceAnomalies.length > 1) {
        const maxSeverity = serviceAnomalies.reduce((max, a) => {
          return this.SEVERITY_WEIGHTS[a.severity] > this.SEVERITY_WEIGHTS[max.severity as keyof typeof this.SEVERITY_WEIGHTS]
            ? a : max
        }, serviceAnomalies[0])

        correlations.push({
          signals: serviceAnomalies.map(a => a.id),
          pattern: `Multiple anomalies affecting ${service}`,
          severity: maxSeverity.severity
        })
      }
    }

    // Group by recommended agent
    const agentGroups = new Map<string, UnifiedAnomaly[]>()
    for (const anomaly of anomalies) {
      const agent = anomaly.recommendedAgent
      if (!agentGroups.has(agent)) {
        agentGroups.set(agent, [])
      }
      agentGroups.get(agent)!.push(anomaly)
    }

    // Find agents with multiple related anomalies
    for (const [agent, agentAnomalies] of agentGroups.entries()) {
      if (agentAnomalies.length > 1) {
        const maxSeverity = agentAnomalies.reduce((max, a) => {
          return this.SEVERITY_WEIGHTS[a.severity] > this.SEVERITY_WEIGHTS[max.severity as keyof typeof this.SEVERITY_WEIGHTS]
            ? a : max
        }, agentAnomalies[0])

        correlations.push({
          signals: agentAnomalies.map(a => a.id),
          pattern: `${agent} should investigate ${agentAnomalies.length} related anomalies`,
          severity: maxSeverity.severity
        })
      }
    }

    return correlations
  }
}

export const anomalyai = new AnomalyAI()
