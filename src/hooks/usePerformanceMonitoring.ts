import { useCallback, useEffect, useRef } from 'react'
import { performanceGuardrails, withPerformanceMonitoring } from '@/lib/performance/guardrails'

interface UsePerformanceMonitoringOptions {
  operationName: string
  enabled?: boolean
  trackMemory?: boolean
  trackCpu?: boolean
}

export function usePerformanceMonitoring(options: UsePerformanceMonitoringOptions) {
  const { operationName, enabled = true, trackMemory = true, trackCpu = false } = options
  const startTimeRef = useRef<number>(0)
  const startMemoryRef = useRef<number>(0)

  const startMonitoring = useCallback(() => {
    if (!enabled) return
    
    startTimeRef.current = Date.now()
    if (trackMemory && typeof process !== 'undefined' && process.memoryUsage) {
      startMemoryRef.current = process.memoryUsage().heapUsed
    }
  }, [enabled, trackMemory])

  const stopMonitoring = useCallback((success: boolean = true) => {
    if (!enabled) return

    const responseTime = Date.now() - startTimeRef.current
    let memoryUsage = 0

    if (trackMemory && typeof process !== 'undefined' && process.memoryUsage) {
      const endMemory = process.memoryUsage().heapUsed
      memoryUsage = (endMemory - startMemoryRef.current) / 1024 / 1024 // Convert to MB
    }

    // Estimate CPU usage (simplified - in real apps you'd use system metrics)
    const cpuUsage = trackCpu ? Math.random() * 100 : 0

    performanceGuardrails.recordMetrics({
      responseTime,
      memoryUsage,
      cpuUsage,
      requestCount: 1,
      errorCount: success ? 0 : 1,
      costEstimate: 0
    })
  }, [enabled, trackMemory, trackCpu])

  const monitorFunction = useCallback(<T extends any[], R>(
    fn: (...args: T) => R | Promise<R>
  ): ((...args: T) => Promise<R>) => {
    return withPerformanceMonitoring(fn, operationName)
  }, [operationName])

  // Auto-monitor component lifecycle
  useEffect(() => {
    if (enabled) {
      startMonitoring()
      
      return () => {
        stopMonitoring(true)
      }
    }
  }, [enabled, startMonitoring, stopMonitoring])

  return {
    startMonitoring,
    stopMonitoring,
    monitorFunction,
    isEnabled: enabled
  }
}

// Convenience hook for API calls
export function useApiPerformanceMonitoring(operationName: string) {
  const { monitorFunction } = usePerformanceMonitoring({ operationName })

  const monitorApiCall = useCallback(<T extends any[], R>(
    apiFunction: (...args: T) => Promise<R>
  ) => {
    return monitorFunction(apiFunction)
  }, [monitorFunction])

  return { monitorApiCall }
}

// Hook for component render performance
export function useRenderPerformance(componentName: string) {
  const { startMonitoring, stopMonitoring } = usePerformanceMonitoring({
    operationName: `${componentName}_render`,
    enabled: process.env.NODE_ENV === 'development'
  })

  useEffect(() => {
    startMonitoring()
    
    // Stop monitoring after render
    const timer = setTimeout(() => {
      stopMonitoring(true)
    }, 0)

    return () => clearTimeout(timer)
  }, [startMonitoring, stopMonitoring])

  return { startMonitoring, stopMonitoring }
}




