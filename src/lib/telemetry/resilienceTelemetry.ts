import { v4 as uuidv4 } from 'uuid'

// Core telemetry types
export interface ResilienceSignal {
  id: string
  timestamp: number
  user_id?: string
  session_id: string
  component: string
  signal_type: ResilienceSignalType
  data: Record<string, any>
}

export type ResilienceSignalType = 
  | 'optimistic_action_start'
  | 'optimistic_action_success'
  | 'optimistic_action_rollback'
  | 'retry_attempt'
  | 'retry_success'
  | 'retry_failure'
  | 'error_boundary_triggered'
  | 'error_boundary_recovered'
  | 'loading_skeleton_shown'
  | 'loading_skeleton_hidden'
  | 'debounced_click_suppressed'

// Telemetry client for sending signals
class ResilienceTelemetryClient {
  private sessionId: string
  private userId?: string
  private endpoint: string
  private batchSize: number = 10
  private batchTimeout: number = 5000
  private signalQueue: ResilienceSignal[] = []
  private batchTimer?: NodeJS.Timeout

  constructor(endpoint: string = '/api/telemetry/resilience') {
    this.sessionId = this.generateSessionId()
    this.endpoint = endpoint
    this.startBatchTimer()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  setUserId(userId: string) {
    this.userId = userId
  }

  // Send individual signal immediately
  async sendSignal(signal: Omit<ResilienceSignal, 'id' | 'timestamp' | 'session_id'>): Promise<void> {
    const fullSignal: ResilienceSignal = {
      ...signal,
      id: uuidv4(),
      timestamp: Date.now(),
      session_id: this.sessionId,
      user_id: this.userId
    }

    // Add to batch queue
    this.signalQueue.push(fullSignal)

    // Send immediately if batch is full
    if (this.signalQueue.length >= this.batchSize) {
      await this.flushBatch()
    }
  }

  // Send batch of signals
  private async flushBatch(): Promise<void> {
    if (this.signalQueue.length === 0) return

    const signals = [...this.signalQueue]
    this.signalQueue = []

    try {
      // Use sendBeacon for reliable delivery
      if (navigator.sendBeacon) {
        const success = navigator.sendBeacon(
          this.endpoint,
          JSON.stringify({ signals })
        )
        if (!success) {
          // Fallback to fetch if sendBeacon fails
          await this.sendViaFetch(signals)
        }
      } else {
        // Fallback for older browsers
        await this.sendViaFetch(signals)
      }
    } catch (error) {
      console.warn('Failed to send resilience telemetry:', error)
      // Re-queue signals for retry
      this.signalQueue.unshift(...signals)
    }
  }

  private async sendViaFetch(signals: ResilienceSignal[]): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signals })
    })

    if (!response.ok) {
      throw new Error(`Telemetry endpoint returned ${response.status}`)
    }
  }

  private startBatchTimer(): void {
    this.batchTimer = setInterval(() => {
      this.flushBatch()
    }, this.batchTimeout)
  }

  // Cleanup
  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer)
    }
    this.flushBatch()
  }
}

// Global telemetry client instance
export const resilienceTelemetry = new ResilienceTelemetryClient()

// High-level telemetry functions
export const telemetry = {
  // Optimistic Actions
  optimisticActionStart: (component: string, actionId: string) => {
    resilienceTelemetry.sendSignal({
      component,
      signal_type: 'optimistic_action_start',
      data: { action_id: actionId }
    })
  },

  optimisticActionSuccess: (component: string, actionId: string, durationMs: number) => {
    resilienceTelemetry.sendSignal({
      component,
      signal_type: 'optimistic_action_success',
      data: { action_id: actionId, duration_ms: durationMs }
    })
  },

  optimisticActionRollback: (component: string, actionId: string, durationMs: number, reason: string) => {
    resilienceTelemetry.sendSignal({
      component,
      signal_type: 'optimistic_action_rollback',
      data: { 
        action_id: actionId, 
        duration_ms: durationMs, 
        rollback_reason: reason 
      }
    })
  },

  // Retry Logic
  retryAttempt: (component: string, endpoint: string, attempt: number, backoffMs: number) => {
    resilienceTelemetry.sendSignal({
      component,
      signal_type: 'retry_attempt',
      data: { 
        api_endpoint: endpoint, 
        retry_count: attempt, 
        backoff_ms: backoffMs 
      }
    })
  },

  retrySuccess: (component: string, endpoint: string, totalAttempts: number, totalDurationMs: number) => {
    resilienceTelemetry.sendSignal({
      component,
      signal_type: 'retry_success',
      data: { 
        api_endpoint: endpoint, 
        total_attempts: totalAttempts, 
        total_duration_ms: totalDurationMs 
      }
    })
  },

  retryFailure: (component: string, endpoint: string, totalAttempts: number, totalDurationMs: number, error: string) => {
    resilienceTelemetry.sendSignal({
      component,
      signal_type: 'retry_failure',
      data: { 
        api_endpoint: endpoint, 
        total_attempts: totalAttempts, 
        total_duration_ms: totalDurationMs,
        final_error: error
      }
    })
  },

  // Error Boundaries
  errorBoundaryTriggered: (component: string, errorType: string, errorMessage: string) => {
    resilienceTelemetry.sendSignal({
      component,
      signal_type: 'error_boundary_triggered',
      data: { 
        error_type: errorType, 
        error_message: errorMessage 
      }
    })
  },

  errorBoundaryRecovered: (component: string, recoveryMethod: string, recoveryTimeMs: number) => {
    resilienceTelemetry.sendSignal({
      component,
      signal_type: 'error_boundary_recovered',
      data: { 
        recovery_method: recoveryMethod, 
        recovery_time_ms: recoveryTimeMs 
      }
    })
  },

  // Loading States
  loadingSkeletonShown: (component: string) => {
    resilienceTelemetry.sendSignal({
      component,
      signal_type: 'loading_skeleton_shown',
      data: { show_time: Date.now() }
    })
  },

  loadingSkeletonHidden: (component: string, durationMs: number) => {
    resilienceTelemetry.sendSignal({
      component,
      signal_type: 'loading_skeleton_hidden',
      data: { duration_ms: durationMs }
    })
  },

  // Debounced Clicks
  debouncedClickSuppressed: (component: string, suppressionReason: string) => {
    resilienceTelemetry.sendSignal({
      component,
      signal_type: 'debounced_click_suppressed',
      data: { suppression_reason: suppressionReason }
    })
  }
}

// Hook for setting user ID when user logs in
export const useResilienceTelemetry = () => {
  return {
    setUserId: (userId: string) => resilienceTelemetry.setUserId(userId),
    // Expose telemetry functions for custom tracking
    track: telemetry
  }
}


