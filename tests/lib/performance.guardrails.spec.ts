import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PerformanceGuardrails } from '@/lib/performance/guardrails'

// Mock the alert service
vi.mock('@/lib/performance/alertService', () => ({
  sendPerformanceAlert: vi.fn()
}))

// Mock the performance config
vi.mock('@/config/performance', () => ({
  getPerformanceConfig: () => ({
    maxResponseTime: 5000,
    maxMemoryUsage: 512,
    maxCpuUsage: 80,
    maxRequestRate: 1000,
    maxErrorRate: 5,
    maxCostPerHour: 15,
    alertThreshold: 75
  })
}))

describe('PerformanceGuardrails', () => {
  let guardrails: PerformanceGuardrails

  beforeEach(() => {
    guardrails = new PerformanceGuardrails()
    vi.clearAllMocks()
  })

  it('should initialize with production configuration', () => {
    const summary = guardrails.getPerformanceSummary()
    expect(summary.current).toBeNull()
    expect(summary.average).toEqual({})
    expect(summary.violations).toEqual([])
    expect(summary.recommendations).toEqual([])
  })

  it('should record performance metrics', () => {
    guardrails.recordMetrics({
      responseTime: 1000,
      memoryUsage: 100,
      cpuUsage: 50,
      requestCount: 1,
      errorCount: 0
    })

    const summary = guardrails.getPerformanceSummary()
    expect(summary.current).not.toBeNull()
    expect(summary.current?.responseTime).toBe(1000)
    expect(summary.current?.memoryUsage).toBe(100)
  })

  it('should detect violations when thresholds are exceeded', () => {
    // Suppress console.warn for this test
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    guardrails.recordMetrics({
      responseTime: 6000, // Exceeds 5000ms limit
      memoryUsage: 600,   // Exceeds 512MB limit
      cpuUsage: 85,       // Exceeds 80% limit
      requestCount: 1,
      errorCount: 0
    })

    const summary = guardrails.getPerformanceSummary()
    expect(summary.violations).toHaveLength(1) // Should have recent violations
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should provide performance recommendations', () => {
    // Record metrics approaching limits
    for (let i = 0; i < 10; i++) {
      guardrails.recordMetrics({
        responseTime: 4500, // 90% of 5000ms limit
        memoryUsage: 460,   // 90% of 512MB limit
        cpuUsage: 72,       // 90% of 80% limit
        requestCount: 1,
        errorCount: 0
      })
    }

    const summary = guardrails.getPerformanceSummary()
    expect(summary.recommendations.length).toBeGreaterThan(0)
  })

  it('should clear metrics and alerts', () => {
    guardrails.recordMetrics({
      responseTime: 1000,
      memoryUsage: 100,
      cpuUsage: 50,
      requestCount: 1,
      errorCount: 0
    })

    let summary = guardrails.getPerformanceSummary()
    expect(summary.current).not.toBeNull()

    guardrails.clear()
    summary = guardrails.getPerformanceSummary()
    expect(summary.current).toBeNull()
    expect(summary.violations).toEqual([])
  })

  it('should enable and disable monitoring', () => {
    guardrails.setEnabled(false)
    
    guardrails.recordMetrics({
      responseTime: 10000, // Would normally trigger alert
      memoryUsage: 1000,
      cpuUsage: 95,
      requestCount: 1,
      errorCount: 1
    })

    // Should not record metrics when disabled
    const summary = guardrails.getPerformanceSummary()
    expect(summary.current).toBeNull()
  })

  it('should calculate average metrics over time', () => {
    const metrics = [
      { responseTime: 1000, memoryUsage: 100, cpuUsage: 50, requestCount: 1, errorCount: 0 },
      { responseTime: 2000, memoryUsage: 200, cpuUsage: 60, requestCount: 1, errorCount: 0 },
      { responseTime: 1500, memoryUsage: 150, cpuUsage: 55, requestCount: 1, errorCount: 0 }
    ]

    metrics.forEach(metric => guardrails.recordMetrics(metric))

    const summary = guardrails.getPerformanceSummary()
    expect(summary.average.responseTime).toBe(1500) // Average of 1000, 2000, 1500
    expect(summary.average.memoryUsage).toBe(150)   // Average of 100, 200, 150
    expect(summary.average.cpuUsage).toBe(55)       // Average of 50, 60, 55
  })
})




