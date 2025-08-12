import { useState, useCallback, useRef } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  success: boolean
}

interface UseAsyncStateOptions {
  initialData?: any
  autoReset?: boolean
  resetDelay?: number
}

export function useAsyncState<T = any>(options: UseAsyncStateOptions = {}) {
  const { initialData = null, autoReset = false, resetDelay = 3000 } = options
  
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null,
    success: false
  })

  const resetTimerRef = useRef<NodeJS.Timeout | null>(null)

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading, error: null, success: false }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, loading: false, success: false }))
    
    if (autoReset && error) {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
      }
      resetTimerRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, error: null }))
      }, resetDelay)
    }
  }, [autoReset, resetDelay])

  const setData = useCallback((data: T) => {
    setState(prev => ({ ...prev, data, loading: false, error: null, success: true }))
    
    if (autoReset) {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
      }
      resetTimerRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, success: false }))
      }, resetDelay)
    }
  }, [autoReset, resetDelay])

  const reset = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
    }
    setState({
      data: initialData,
      loading: false,
      error: null,
      success: false
    })
  }, [initialData])

  const execute = useCallback(async <R>(
    asyncFn: () => Promise<R>,
    options?: {
      onSuccess?: (data: R) => void
      onError?: (error: string) => void
      transform?: (data: R) => T
    }
  ) => {
    try {
      setLoading(true)
      const result = await asyncFn()
      const transformedData = options?.transform ? options.transform(result) : result as T
      
      setData(transformedData)
      options?.onSuccess?.(result)
      
      return { success: true, data: result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setError(errorMessage)
      options?.onError?.(errorMessage)
      
      return { success: false, error: errorMessage }
    }
  }, [setLoading, setData, setError])

  // Cleanup timer on unmount
  const cleanup = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
    }
  }, [])

  return {
    ...state,
    setLoading,
    setError,
    setData,
    reset,
    execute,
    cleanup
  }
}

// Specialized hooks for common use cases
export function useAsyncOperation<T = any>(options?: UseAsyncStateOptions) {
  const state = useAsyncState<T>(options)
  
  const run = useCallback(async <R>(
    operation: () => Promise<R>,
    transform?: (data: R) => T
  ) => {
    return state.execute(operation, { transform })
  }, [state])

  return {
    ...state,
    run
  }
}

export function useAsyncData<T = any>(options?: UseAsyncStateOptions) {
  const state = useAsyncState<T>(options)
  
  const fetch = useCallback(async <R>(
    fetchFn: () => Promise<R>,
    transform?: (data: R) => T
  ) => {
    return state.execute(fetchFn, { transform })
  }, [state])

  return {
    ...state,
    fetch
  }
}

export function useAsyncMutation<T = any>(options?: UseAsyncStateOptions) {
  const state = useAsyncState<T>(options)
  
  const mutate = useCallback(async <R>(
    mutationFn: () => Promise<R>,
    transform?: (data: R) => T
  ) => {
    return state.execute(mutationFn, { transform })
  }, [state])

  return {
    ...state,
    mutate
  }
}
