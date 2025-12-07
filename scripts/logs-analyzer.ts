/**
 * LogsAI - Pattern detection and analysis
 * 
 * Detects patterns, regressions, and correlations in logs
 */

import { randomUUID } from 'node:crypto'
import type { LogEntry, LogPattern, LogAnalysis, LogCategory, LogSeverity } from '../src/types/logs'
import { loadPatterns, savePatterns } from './logs-store'
import { loadEvents } from './ops-events-store'
import type { OpsEvent } from '../src/types/opsEvents'

/**
 * Extract error patterns from log messages
 */
function extractErrorPattern(message: string): string {
  // Normalize common patterns
  let pattern = message
  
  // Remove UUIDs
  pattern = pattern.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
  
  // Remove timestamps
  pattern = pattern.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '<timestamp>')
  
  // Remove numbers (but keep structure)
  pattern = pattern.replace(/\d+/g, '<number>')
  
  // Remove email addresses
  pattern = pattern.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '<email>')
  
  // Remove URLs
  pattern = pattern.replace(/https?:\/\/[^\s]+/g, '<url>')
  
  return pattern.trim()
}

/**
 * Detect patterns in logs
 */
export function detectPatterns(
  logs: LogEntry[],
  existingPatterns: LogPattern[] = []
): {
  newPatterns: LogPattern[]
  recurringPatterns: LogPattern[]
  regressions: LogPattern[]
} {
  const patternMap = new Map<string, {
    pattern: string
    category: LogCategory
    severity: LogSeverity
    occurrences: LogEntry[]
    firstSeen: string
    lastSeen: string
  }>()
  
  // Group logs by pattern
  for (const log of logs) {
    if (log.severity === 'error' || log.severity === 'critical') {
      const pattern = extractErrorPattern(log.message)
      const key = `${log.category}:${pattern}`
      
      if (!patternMap.has(key)) {
        patternMap.set(key, {
          pattern,
          category: log.category,
          severity: log.severity,
          occurrences: [],
          firstSeen: log.timestamp,
          lastSeen: log.timestamp
        })
      }
      
      const entry = patternMap.get(key)!
      entry.occurrences.push(log)
      if (new Date(log.timestamp) < new Date(entry.firstSeen)) {
        entry.firstSeen = log.timestamp
      }
      if (new Date(log.timestamp) > new Date(entry.lastSeen)) {
        entry.lastSeen = log.timestamp
      }
    }
  }
  
  // Convert to patterns
  const detectedPatterns: LogPattern[] = []
  for (const [key, data] of patternMap.entries()) {
    const affectedServices = [
      ...new Set(
        data.occurrences
          .map((log) => log.service)
          .filter((s): s is string => !!s)
      )
    ]
    
    // Check if this pattern exists in stored patterns
    const existing = existingPatterns.find(
      (p) => p.pattern === data.pattern && p.category === data.category
    )
    
    const isRegression = existing?.resolvedAt 
      ? new Date(data.firstSeen) > new Date(existing.resolvedAt)
      : false
    
    detectedPatterns.push({
      id: existing?.id || `pattern-${randomUUID()}`,
      pattern: data.pattern,
      category: data.category,
      severity: data.severity,
      description: data.occurrences[0]?.message || data.pattern,
      firstSeen: existing?.firstSeen || data.firstSeen,
      lastSeen: data.lastSeen,
      occurrenceCount: data.occurrences.length,
      affectedServices: affectedServices.length > 0 ? affectedServices : undefined,
      isRegression,
      resolvedAt: existing?.resolvedAt
    })
  }
  
  // Categorize patterns
  const newPatterns: LogPattern[] = []
  const recurringPatterns: LogPattern[] = []
  const regressions: LogPattern[] = []
  
  for (const pattern of detectedPatterns) {
    const existing = existingPatterns.find(
      (p) => p.id === pattern.id || 
             (p.pattern === pattern.pattern && p.category === pattern.category)
    )
    
    if (pattern.isRegression) {
      regressions.push(pattern)
    } else if (existing) {
      recurringPatterns.push(pattern)
    } else {
      newPatterns.push(pattern)
    }
  }
  
  return { newPatterns, recurringPatterns, regressions }
}

/**
 * Correlate logs with deployments
 */
export function correlateWithDeployments(
  logs: LogEntry[],
  events: OpsEvent[]
): LogAnalysis['deploymentCorrelations'] {
  const deploymentEvents = events.filter((e) => e.type === 'deployment')
  const correlations: LogAnalysis['deploymentCorrelations'] = []
  
  for (const deployment of deploymentEvents) {
    const deploymentTime = new Date(deployment.timestamp).getTime()
    const deploymentSha = deployment.data.deploymentSha as string | undefined
    
    if (!deploymentSha) continue
    
    // Find logs within 1 hour after deployment
    const windowMs = 60 * 60 * 1000 // 1 hour
    const correlatedLogs = logs.filter((log) => {
      const logTime = new Date(log.timestamp).getTime()
      return logTime >= deploymentTime && logTime <= deploymentTime + windowMs
    })
    
    if (correlatedLogs.length > 0) {
      const patterns = [
        ...new Set(
          correlatedLogs
            .map((log) => extractErrorPattern(log.message))
            .filter((p) => p.length > 0)
        )
      ]
      
      correlations.push({
        deploymentSha,
        deploymentTime: deployment.timestamp,
        correlatedLogs: correlatedLogs.length,
        patterns
      })
    }
  }
  
  return correlations.length > 0 ? correlations : undefined
}

/**
 * Get top errors
 */
export function getTopErrors(logs: LogEntry[]): LogAnalysis['topErrors'] {
  const errorMap = new Map<string, {
    message: string
    count: number
    firstSeen: string
    lastSeen: string
    services: Set<string>
  }>()
  
  for (const log of logs) {
    if (log.severity === 'error' || log.severity === 'critical') {
      const key = log.message
      
      if (!errorMap.has(key)) {
        errorMap.set(key, {
          message: log.message,
          count: 0,
          firstSeen: log.timestamp,
          lastSeen: log.timestamp,
          services: new Set()
        })
      }
      
      const entry = errorMap.get(key)!
      entry.count++
      if (new Date(log.timestamp) < new Date(entry.firstSeen)) {
        entry.firstSeen = log.timestamp
      }
      if (new Date(log.timestamp) > new Date(entry.lastSeen)) {
        entry.lastSeen = log.timestamp
      }
      if (log.service) {
        entry.services.add(log.service)
      }
    }
  }
  
  return Array.from(errorMap.values())
    .map((entry) => ({
      message: entry.message,
      count: entry.count,
      firstSeen: entry.firstSeen,
      lastSeen: entry.lastSeen,
      affectedServices: Array.from(entry.services)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

/**
 * Generate insights
 */
export function generateInsights(
  logs: LogEntry[],
  patterns: {
    newPatterns: LogPattern[]
    recurringPatterns: LogPattern[]
    regressions: LogPattern[]
  },
  correlations?: LogAnalysis['deploymentCorrelations']
): string[] {
  const insights: string[] = []
  
  // Regression insights
  if (patterns.regressions.length > 0) {
    insights.push(
      `⚠️ ${patterns.regressions.length} regression(s) detected: patterns that reappeared after resolution`
    )
  }
  
  // New pattern insights
  if (patterns.newPatterns.length > 0) {
    insights.push(
      `🔍 ${patterns.newPatterns.length} new error pattern(s) detected`
    )
  }
  
  // Deployment correlation insights
  if (correlations && correlations.length > 0) {
    const totalCorrelated = correlations.reduce((sum, c) => sum + c.correlatedLogs, 0)
    insights.push(
      `📦 ${correlations.length} deployment(s) correlated with ${totalCorrelated} log entries`
    )
  }
  
  // Error rate insights
  const errorCount = logs.filter((l) => l.severity === 'error' || l.severity === 'critical').length
  const totalLogs = logs.length
  if (totalLogs > 0) {
    const errorRate = (errorCount / totalLogs) * 100
    if (errorRate > 10) {
      insights.push(
        `📊 High error rate: ${errorRate.toFixed(1)}% of logs are errors (${errorCount}/${totalLogs})`
      )
    }
  }
  
  // Service-specific insights
  const serviceErrors = new Map<string, number>()
  for (const log of logs) {
    if (log.severity === 'error' || log.severity === 'critical') {
      const service = log.service || 'unknown'
      serviceErrors.set(service, (serviceErrors.get(service) || 0) + 1)
    }
  }
  
  const topService = Array.from(serviceErrors.entries())
    .sort((a, b) => b[1] - a[1])[0]
  
  if (topService && topService[1] > 10) {
    insights.push(
      `🎯 Service ${topService[0]} has ${topService[1]} error(s) - highest error count`
    )
  }
  
  return insights
}
