import { useState, useCallback } from 'react'

interface UseOptimisticActionOptions<T, P = void> {
  action: (params: P) => Promise<T>
  onOptimistic?: (params: P) => void
  onSuccess?: (result: T, params: P) => void
  onError?: (error: Error, params: P) => void
  onRollback?: (params: P) => void
}

interface UseOptimisticActionReturn<T, P> {
  execute: (params: P) => Promise<T | null>
  isLoading: boolean
  error: Error | null
  status: 'idle' | 'optimistic' | 'loading' | 'success' | 'error'
  rollback: (params: P) => void
}

export function useOptimisticAction<T, P = void>({
  action,
  onOptimistic,
  onSuccess,
  onError,
  onRollback
}: UseOptimisticActionOptions<T, P>): UseOptimisticActionReturn<T, P> {
  const [status, setStatus] = useState<'idle' | 'optimistic' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async (params: P): Promise<T | null> => {
    try {
      // 1. OPTIMISTIC UPDATE
      setStatus('optimistic')
      onOptimistic?.(params)

      // 2. EXECUTE ACTION
      setStatus('loading')
      const result = await action(params)

      // 3. SUCCESS
      setStatus('success')
      setError(null)
      onSuccess?.(result, params)
      return result

    } catch (err) {
      // 4. ERROR - ROLLBACK
      const error = err instanceof Error ? err : new Error('Action failed')
      setStatus('error')
      setError(error)
      onError?.(error, params)
      onRollback?.(params)
      return null
    }
  }, [action, onOptimistic, onSuccess, onError, onRollback])

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
