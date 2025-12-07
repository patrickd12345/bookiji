/**
 * LogsAI - Log intelligence types
 * 
 * Types for log entries, patterns, and analysis results
 */

export type LogCategory = 'error' | 'system' | 'booking' | 'event'

export type LogSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface LogEntry {
  id: string // uuid
  timestamp: string // ISO
  category: LogCategory
  severity: LogSeverity
  
  // Core log data
  message: string
  source: string // e.g., 'api', 'database', 'stripe', 'booking-service'
  service?: string // e.g., '/api/quote', 'stripe-webhook'
  
  // Context
  userId?: string
  bookingId?: string
  requestId?: string
  
  // Error details (if applicable)
  errorType?: string
  errorMessage?: string
  stackTrace?: string
  
  // Metadata
  metadata?: Record<string, unknown>
  tags?: string[]
  
  // Related entities
  relatedEventIds?: string[]
  relatedIncidentIds?: string[]
  deploymentSha?: string // For correlation with deployments
}

export interface LogPattern {
  id: string
  pattern: string // regex or text pattern
  category: LogCategory
  severity: LogSeverity
  description: string
  firstSeen: string // ISO timestamp
  lastSeen: string // ISO timestamp
  occurrenceCount: number
  affectedServices?: string[]
  isRegression?: boolean // true if pattern reappeared after being resolved
  resolvedAt?: string // ISO timestamp
}

export interface LogAnalysis {
  timestamp: string // ISO
  category: LogCategory
  timeRange: {
    start: string // ISO
    end: string // ISO
  }
  
  // Summary statistics
  totalLogs: number
  errorCount: number
  warningCount: number
  criticalCount: number
  
  // Pattern detection
  newPatterns: LogPattern[] // Patterns seen for the first time
  recurringPatterns: LogPattern[] // Patterns seen before
  regressions: LogPattern[] // Patterns that reappeared after resolution
  
  // Correlation
  deploymentCorrelations?: {
    deploymentSha: string
    deploymentTime: string
    correlatedLogs: number
    patterns: string[]
  }[]
  
  // Top errors
  topErrors: {
    message: string
    count: number
    firstSeen: string
    lastSeen: string
    affectedServices: string[]
  }[]
  
  // Analysis insights
  insights: string[] // Human-readable insights
}
