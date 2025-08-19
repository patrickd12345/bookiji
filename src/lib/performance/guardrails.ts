/**
 * Performance & Cost Guardrails
 * 
 * This module provides performance monitoring and cost control mechanisms
 * to prevent runaway costs and ensure application performance.
 */

import { getPerformanceConfig } from '@/config/performance'
import { sendPerformanceAlert } from './alertService'

export interface PerformanceMetrics {
  responseTime: number
  memoryUsage: number
  cpuUsage: number
  requestCount: number
  errorCount: number
  costEstimate: number
  timestamp?: number
}

export interface GuardrailConfig {
  maxResponseTime: number // milliseconds
  maxMemoryUsage: number // MB
  maxCpuUsage: number // percentage
  maxRequestRate: number // requests per minute
  maxErrorRate: number // percentage
  maxCostPerHour: number // USD
  alertThreshold: number // percentage of limit
}

export class PerformanceGuardrails {
  private metrics: PerformanceMetrics[] = []
  private config: GuardrailConfig
  private alerts: string[] = []
  private isEnabled: boolean = true

  constructor(config: Partial<GuardrailConfig> = {}) {
    // Use production configuration as base, then override with any provided config
    const productionConfig = getPerformanceConfig()
    this.config = {
      ...productionConfig,
      ...config
    }
  }

  /**
   * Record performance metrics
   */
  recordMetrics(metrics: Partial<PerformanceMetrics>) {
    if (!this.isEnabled) return

    const timestamp = Date.now()
    const fullMetrics: PerformanceMetrics = {
      responseTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      requestCount: 0,
      errorCount: 0,
      costEstimate: 0,
      ...metrics,
      timestamp
    }

    this.metrics.push(fullMetrics)
    
    // Keep only last 1000 metrics to prevent memory bloat
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }

    // Check guardrails
    this.checkGuardrails(fullMetrics)
  }

  /**
   * Check if any guardrails are being violated
   */
  private checkGuardrails(metrics: PerformanceMetrics) {
    const violations: string[] = []

    if (metrics.responseTime > this.config.maxResponseTime) {
      violations.push(`Response time ${metrics.responseTime}ms exceeds limit ${this.config.maxResponseTime}ms`)
    }

    if (metrics.memoryUsage > this.config.maxMemoryUsage) {
      violations.push(`Memory usage ${metrics.memoryUsage}MB exceeds limit ${this.config.maxMemoryUsage}MB`)
    }

    if (metrics.cpuUsage > this.config.maxCpuUsage) {
      violations.push(`CPU usage ${metrics.cpuUsage}% exceeds limit ${this.config.maxCpuUsage}%`)
    }

    if (metrics.costEstimate > this.config.maxCostPerHour) {
      violations.push(`Cost estimate $${metrics.costEstimate}/hr exceeds limit $${this.config.maxCostPerHour}/hr`)
    }

    // Check rates over time
    const recentMetrics = this.metrics.slice(-60) // Last 60 seconds
    const requestRate = recentMetrics.reduce((sum, m) => sum + m.requestCount, 0)
    if (requestRate > this.config.maxRequestRate / 60) {
      violations.push(`Request rate ${requestRate}/min exceeds limit ${this.config.maxRequestRate}/min`)
    }

    const errorRate = recentMetrics.length > 0 
      ? (recentMetrics.reduce((sum, m) => sum + m.errorCount, 0) / requestRate) * 100
      : 0
    if (errorRate > this.config.maxErrorRate) {
      violations.push(`Error rate ${errorRate.toFixed(2)}% exceeds limit ${this.config.maxErrorRate}%`)
    }

    // Record violations
    if (violations.length > 0) {
      this.alerts.push(`[${new Date().toISOString()}] ${violations.join(', ')}`)
      console.warn('🚨 Performance guardrail violations:', violations)
      
      // Send alerts if configured
      this.sendAlerts(violations)
    }
  }

  /**
   * Send performance alerts
   */
  private async sendAlerts(violations: string[]) {
    try {
      // Extract metrics for alert context
      const latestMetric = this.metrics[this.metrics.length - 1]
      const metricsContext = latestMetric ? {
        responseTime: latestMetric.responseTime,
        memoryUsage: latestMetric.memoryUsage,
        cpuUsage: latestMetric.cpuUsage,
        requestCount: latestMetric.requestCount,
        errorCount: latestMetric.errorCount
      } : undefined

      // Send to alert service (Slack, PagerDuty, etc.)
      await sendPerformanceAlert(violations, metricsContext)

      // Send to analytics/error tracking
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        // Client-side: send to analytics
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'performance_guardrail_violation',
            properties: {
              violations,
              timestamp: new Date().toISOString(),
              url: window.location.href,
              metrics: metricsContext
            }
          })
        }).catch(() => {
          // Silently fail if analytics endpoint is unavailable
        })
      } else {
        // Server-side: log to console and send to monitoring service
        console.error('🚨 Server-side performance guardrail violations:', violations)
      }
    } catch (error) {
      console.error('Failed to send performance alert:', error)
    }
  }

  /**
   * Get current performance summary
   */
  getPerformanceSummary(): {
    current: PerformanceMetrics | null
    average: Partial<PerformanceMetrics>
    violations: string[]
    recommendations: string[]
  } {
    if (this.metrics.length === 0) {
      return {
        current: null,
        average: {},
        violations: [],
        recommendations: []
      }
    }

    const current = this.metrics[this.metrics.length - 1]
    const recent = this.metrics.slice(-100) // Last 100 metrics

    const average = {
      responseTime: recent.reduce((sum, m) => sum + m.responseTime, 0) / recent.length,
      memoryUsage: recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length,
      cpuUsage: recent.reduce((sum, m) => sum + m.cpuUsage, 0) / recent.length,
      requestCount: recent.reduce((sum, m) => sum + m.requestCount, 0) / recent.length,
      errorCount: recent.reduce((sum, m) => sum + m.errorCount, 0) / recent.length,
      costEstimate: recent.reduce((sum, m) => sum + m.costEstimate, 0) / recent.length
    }

    const recommendations: string[] = []
    
    if (average.responseTime > this.config.maxResponseTime * 0.8) {
      recommendations.push('Consider optimizing database queries or adding caching')
    }
    
    if (average.memoryUsage > this.config.maxMemoryUsage * 0.8) {
      recommendations.push('Monitor memory leaks and consider memory optimization')
    }
    
    if (average.cpuUsage > this.config.maxCpuUsage * 0.8) {
      recommendations.push('Consider scaling horizontally or optimizing CPU-intensive operations')
    }
    
    const errorRate = average.requestCount > 0 ? (average.errorCount / average.requestCount) * 100 : 0
    if (errorRate > this.config.maxErrorRate * 0.8) {
      recommendations.push('Investigate error patterns and improve error handling')
    }

    return {
      current,
      average,
      violations: this.alerts.slice(-10), // Last 10 violations
      recommendations
    }
  }

  /**
   * Enable/disable guardrails
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
  }

  /**
   * Update guardrail configuration
   */
  updateConfig(newConfig: Partial<GuardrailConfig>) {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Clear all metrics and alerts
   */
  clear() {
    this.metrics = []
    this.alerts = []
  }
}

// Global instance
export const performanceGuardrails = new PerformanceGuardrails()

// Performance monitoring middleware
export function withPerformanceMonitoring<T extends any[], R>(
  fn: (...args: T) => R | Promise<R>,
  operationName: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    const startMemory = process.memoryUsage?.()?.heapUsed || 0
    
    try {
      const result = await fn(...args)
      
      // Record success metrics
      performanceGuardrails.recordMetrics({
        responseTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage?.()?.heapUsed 
          ? (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024 
          : 0,
        requestCount: 1,
        errorCount: 0,
        costEstimate: 0 // Could be calculated based on operation type
      })
      
      return result
    } catch (error) {
      // Record error metrics
      performanceGuardrails.recordMetrics({
        responseTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage?.()?.heapUsed 
          ? (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024 
          : 0,
        requestCount: 1,
        errorCount: 1,
        costEstimate: 0
      })
      
      throw error
    }
  }
}

// Cost estimation utilities
export class CostEstimator {
  private static readonly COST_PER_1000_REQUESTS = 0.01 // $0.01 per 1000 requests
  private static readonly COST_PER_GB_HOUR = 0.10 // $0.10 per GB-hour
  private static readonly COST_PER_CPU_HOUR = 0.05 // $0.05 per CPU-hour

  /**
   * Estimate cost for API operations
   */
  static estimateApiCost(requestCount: number): number {
    return (requestCount / 1000) * this.COST_PER_1000_REQUESTS
  }

  /**
   * Estimate cost for compute resources
   */
  static estimateComputeCost(memoryGB: number, cpuHours: number): number {
    return (memoryGB * this.COST_PER_GB_HOUR) + (cpuHours * this.COST_PER_CPU_HOUR)
  }

  /**
   * Get cost breakdown for current usage
   */
  static getCostBreakdown(metrics: PerformanceMetrics[]): {
    apiCost: number
    computeCost: number
    totalCost: number
  } {
    const totalRequests = metrics.reduce((sum, m) => sum + m.requestCount, 0)
    const totalMemoryHours = metrics.reduce((sum, m) => sum + (m.memoryUsage / 1024), 0) / 3600 // Convert to GB-hours
    const totalCpuHours = metrics.reduce((sum, m) => sum + (m.cpuUsage / 100), 0) / 3600 // Convert to CPU-hours

    const apiCost = this.estimateApiCost(totalRequests)
    const computeCost = this.estimateComputeCost(totalMemoryHours, totalCpuHours)

    return {
      apiCost,
      computeCost,
      totalCost: apiCost + computeCost
    }
  }
}
