import { useState, useCallback } from 'react'
import { telemetry } from '@/lib/telemetry/resilienceTelemetry'

interface UseOptimisticActionWithTelemetryOptions<T, P = void> {
  action: (params: P) => Promise<T>
  onOptimistic?: (params: P) => void
  onSuccess?: (result: T, params: P) => void
  onError?: (error: Error, params: P) => void
  onRollback?: (params: P) => void
  component: string // Required for telemetry
}

interface UseOptimisticActionWithTelemetryReturn<T, P> {
  execute: (params: P) => Promise<T | null>
  isLoading: boolean
  error: Error | null
  status: 'idle' | 'optimistic' | 'loading' | 'success' | 'error'
  rollback: (params: P) => void
}

export function useOptimisticActionWithTelemetry<T, P = void>({
  action,
  onOptimistic,
  onSuccess,
  onError,
  onRollback,
  component
}: UseOptimisticActionWithTelemetryOptions<T, P>): UseOptimisticActionWithTelemetryReturn<T, P> {
  const [status, setStatus] = useState<'idle' | 'optimistic' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [_actionStartTime, setActionStartTime] = useState<number>(0)

  const execute = useCallback(async (params: P): Promise<T | null> => {
    const actionId = `${component}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()
    
    try {
      // 1. OPTIMISTIC UPDATE
      setStatus('optimistic')
      setActionStartTime(startTime)
      
      // Track optimistic action start
      telemetry.optimisticActionStart(component, actionId)
      
      onOptimistic?.(params)

      // 2. EXECUTE ACTION
      setStatus('loading')
      const result = await action(params)

      // 3. SUCCESS
      const duration = Date.now() - startTime
      setStatus('success')
      setError(null)
      
      // Track successful action
      telemetry.optimisticActionSuccess(component, actionId, duration)
      
      onSuccess?.(result, params)
      return result

    } catch (err) {
      // 4. ERROR - ROLLBACK
      const duration = Date.now() - startTime
      const error = err instanceof Error ? err : new Error('Action failed')
      
      setStatus('error')
      setError(error)
      
      // Track rollback with reason
      const rollbackReason = error.message || 'Unknown error'
      telemetry.optimisticActionRollback(component, actionId, duration, rollbackReason)
      
      onError?.(error, params)
      onRollback?.(params)
      return null
    }
  }, [action, onOptimistic, onSuccess, onError, onRollback, component])

  const rollback = useCallback((params: P) => {
    setStatus('idle')
    setError(null)
    onRollback?.(params)
  }, [onRollback])

  return {
    execute,
    isLoading: status === 'loading',
    error,
    status,
    rollback
  }
}


