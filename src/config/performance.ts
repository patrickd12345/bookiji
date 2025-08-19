/**
 * Production Performance Guardrails Configuration
 * 
 * This file contains production-ready thresholds and alert configurations
 * for the performance monitoring system.
 */

import { GuardrailConfig } from '@/lib/performance/guardrails'

// Environment-specific configurations
const ENVIRONMENT_CONFIGS = {
  development: {
    maxResponseTime: 10000, // 10 seconds - more lenient for dev
    maxMemoryUsage: 1024, // 1GB - dev environments often have more memory
    maxCpuUsage: 90, // 90% - dev can run hotter
    maxRequestRate: 2000, // 2000 req/min - higher for testing
    maxErrorRate: 10, // 10% - more tolerant in dev
    maxCostPerHour: 50, // $50/hr - dev environment
    alertThreshold: 85, // Alert at 85% of limit
  },
  staging: {
    maxResponseTime: 7000, // 7 seconds
    maxMemoryUsage: 768, // 768MB
    maxCpuUsage: 85, // 85%
    maxRequestRate: 1500, // 1500 req/min
    maxErrorRate: 7, // 7%
    maxCostPerHour: 25, // $25/hr
    alertThreshold: 80, // Alert at 80% of limit
  },
  production: {
    maxResponseTime: 5000, // 5 seconds - strict for production
    maxMemoryUsage: 512, // 512MB - optimize for cost
    maxCpuUsage: 80, // 80% - leave headroom for spikes
    maxRequestRate: 1000, // 1000 req/min - production traffic
    maxErrorRate: 5, // 5% - low error tolerance
    maxCostPerHour: 15, // $15/hr - cost control
    alertThreshold: 75, // Alert at 75% of limit - early warning
  },
} as const

// Alert channels configuration
export interface AlertChannelConfig {
  enabled: boolean
  webhook?: string
  email?: string
  slack?: {
    webhookUrl: string
    channel: string
    username?: string
  }
  teams?: {
    webhookUrl: string
  }
  pagerduty?: {
    integrationKey: string
    severity: 'critical' | 'error' | 'warning' | 'info'
  }
}

export const ALERT_CHANNELS: Record<string, AlertChannelConfig> = {
  development: {
    enabled: false, // Disable alerts in dev to avoid noise
  },
  staging: {
    enabled: true,
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL_STAGING || '',
      channel: '#staging-alerts',
      username: 'Bookiji Staging Monitor'
    }
  },
  production: {
    enabled: true,
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL_PROD || '',
      channel: '#production-alerts',
      username: 'Bookiji Production Monitor'
    },
    email: process.env.ALERT_EMAIL || 'alerts@bookiji.com',
    pagerduty: {
      integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY || '',
      severity: 'critical'
    }
  }
}

// Critical thresholds that trigger immediate alerts
export const CRITICAL_THRESHOLDS = {
  responseTime: 15000, // 15 seconds - system is essentially down
  memoryUsage: 2048, // 2GB - memory leak or serious issue
  cpuUsage: 95, // 95% - system overload
  errorRate: 25, // 25% - major system failure
  requestRate: 5000, // 5000 req/min - potential DDoS or runaway process
}

/**
 * Get performance configuration based on environment
 */
export function getPerformanceConfig(): GuardrailConfig {
  const env = process.env.NODE_ENV || 'development'
  const deployEnv = process.env.DEPLOY_ENV || env
  
  // Use production config for any production-like environment
  const configKey = ['production', 'prod'].includes(deployEnv.toLowerCase()) ? 'production' : 
                   ['staging', 'stage'].includes(deployEnv.toLowerCase()) ? 'staging' : 
                   'development'
  
  return ENVIRONMENT_CONFIGS[configKey]
}

/**
 * Get alert configuration based on environment
 */
export function getAlertConfig(): AlertChannelConfig {
  const env = process.env.NODE_ENV || 'development'
  const deployEnv = process.env.DEPLOY_ENV || env
  
  const configKey = ['production', 'prod'].includes(deployEnv.toLowerCase()) ? 'production' : 
                   ['staging', 'stage'].includes(deployEnv.toLowerCase()) ? 'staging' : 
                   'development'
  
  return ALERT_CHANNELS[configKey]
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning', 
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Determine alert severity based on violation
 */
export function getAlertSeverity(metric: string, value: number, threshold: number): AlertSeverity {
  const criticalThreshold = CRITICAL_THRESHOLDS[metric as keyof typeof CRITICAL_THRESHOLDS]
  
  if (criticalThreshold && value >= criticalThreshold) {
    return AlertSeverity.CRITICAL
  }
  
  const ratio = value / threshold
  if (ratio >= 1.2) return AlertSeverity.CRITICAL
  if (ratio >= 1.0) return AlertSeverity.ERROR
  if (ratio >= 0.9) return AlertSeverity.WARNING
  return AlertSeverity.INFO
}

/**
 * Format alert message for different channels
 */
export function formatAlertMessage(
  violations: string[], 
  severity: AlertSeverity,
  environment: string
): {
  title: string
  message: string
  color?: string
  emoji?: string
} {
  const emoji = {
    [AlertSeverity.CRITICAL]: '🚨',
    [AlertSeverity.ERROR]: '❌', 
    [AlertSeverity.WARNING]: '⚠️',
    [AlertSeverity.INFO]: 'ℹ️'
  }[severity]

  const color = {
    [AlertSeverity.CRITICAL]: '#FF0000',
    [AlertSeverity.ERROR]: '#FF4444',
    [AlertSeverity.WARNING]: '#FFA500', 
    [AlertSeverity.INFO]: '#0066CC'
  }[severity]

  const title = `${emoji} ${severity.toUpperCase()} - Performance Alert (${environment})`
  
  const message = [
    `Environment: ${environment}`,
    `Severity: ${severity}`,
    `Time: ${new Date().toISOString()}`,
    '',
    'Violations:',
    ...violations.map(v => `• ${v}`),
    '',
    'Please investigate immediately if this is a production environment.'
  ].join('\n')

  return { title, message, color, emoji }
}

// Export default configuration
export default {
  getPerformanceConfig,
  getAlertConfig,
  getAlertSeverity,
  formatAlertMessage,
  CRITICAL_THRESHOLDS,
  AlertSeverity
}

