/**
 * Metrics Collection for Calendar Sync
 * 
 * In-memory metrics storage (can be extended to external metrics service)
 */

interface MetricValue {
  count: number
  sum: number
  min: number
  max: number
  values: number[]
}

class MetricsStore {
  private counters: Map<string, number> = new Map()
  private histograms: Map<string, MetricValue> = new Map()

  incrementCounter(name: string, value = 1): void {
    const current = this.counters.get(name) || 0
    this.counters.set(name, current + value)
  }

  recordHistogram(name: string, value: number): void {
    const existing = this.histograms.get(name)
    if (!existing) {
      this.histograms.set(name, {
        count: 1,
        sum: value,
        min: value,
        max: value,
        values: [value],
      })
    } else {
      existing.count++
      existing.sum += value
      existing.min = Math.min(existing.min, value)
      existing.max = Math.max(existing.max, value)
      existing.values.push(value)
      // Keep only last 1000 values to prevent unbounded growth
      if (existing.values.length > 1000) {
        existing.values = existing.values.slice(-1000)
      }
    }
  }

  getCounter(name: string): number {
    return this.counters.get(name) || 0
  }

  getHistogram(name: string): MetricValue | null {
    return this.histograms.get(name) || null
  }

  getAllMetrics(): {
    counters: Record<string, number>
    histograms: Record<string, MetricValue>
  } {
    const counters: Record<string, number> = {}
    for (const [name, value] of this.counters.entries()) {
      counters[name] = value
    }

    const histograms: Record<string, MetricValue> = {}
    for (const [name, value] of this.histograms.entries()) {
      histograms[name] = { ...value }
    }

    return { counters, histograms }
  }

  reset(): void {
    this.counters.clear()
    this.histograms.clear()
  }
}

const store = new MetricsStore()

/**
 * Increment calendar sync runs counter
 */
export function incrementSyncRuns(): void {
  store.incrementCounter('calendar_sync_runs_total')
}

/**
 * Increment calendar sync failures counter
 */
export function incrementSyncFailures(): void {
  store.incrementCounter('calendar_sync_failures_total')
}

/**
 * Record calendar sync items processed
 */
export function recordItemsProcessed(count: number): void {
  store.incrementCounter('calendar_sync_items_processed', count)
}

/**
 * Record calendar sync latency
 */
export function recordLatency(ms: number): void {
  store.recordHistogram('calendar_sync_latency_ms', ms)
}

/**
 * Get all metrics
 */
export function getAllMetrics(): {
  counters: Record<string, number>
  histograms: Record<string, MetricValue>
} {
  return store.getAllMetrics()
}

/**
 * Get a specific counter value
 */
export function getCounter(name: string): number {
  return store.getCounter(name)
}

/**
 * Get a specific histogram value
 */
export function getHistogram(name: string): MetricValue | null {
  return store.getHistogram(name)
}

/**
 * Reset all metrics (useful for tests)
 */
export function resetMetrics(): void {
  store.reset()
}
