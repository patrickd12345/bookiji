"use client"

import { useState, useCallback } from 'react'
import { useUIStore } from '@/stores/uiStore'

interface RequestState {
  loading: boolean
  error: string | null
  data: unknown
}

interface UseRequestStateOptions {
  onSuccess?: (data: unknown) => void
  onError?: (error: Error) => void
  retryDelay?: number
  maxRetries?: number
}

export function useRequestState<T = unknown>(
  options: UseRequestStateOptions = {}
) {
  const [state, setState] = useState<RequestState>({
    loading: false,
    error: null,
    data: null
  })
  
  const { setLastFailedRequest } = useUIStore()
  const { onSuccess, onError, retryDelay = 1000, maxRetries = 3 } = options

  const execute = useCallback(async (
    requestFn: () => Promise<T>,
    url?: string,
    method = 'GET'
  ): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    let retryCount = 0
    const attemptRequest = async (): Promise<T | null> => {
      try {
        const result = await requestFn()
        setState({ loading: false, error: null, data: result })
        onSuccess?.(result)
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Request failed'
        
        if (retryCount < maxRetries) {
          retryCount++
          console.log(`Request failed, retrying (${retryCount}/${maxRetries})...`)
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          return attemptRequest()
        } else {
          // Final failure - set up retry mechanism
          setState({ loading: false, error: errorMessage, data: null })
          
          if (url) {
            setLastFailedRequest({
              url,
              method,
              retryFn: () => execute(requestFn, url, method)
            })
          }
          
          onError?.(error instanceof Error ? error : new Error(errorMessage))
          return null
        }
      }
    }

    return attemptRequest()
  }, [onSuccess, onError, retryDelay, maxRetries, setLastFailedRequest])

  const retry = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null })
    setLastFailedRequest(null)
  }, [setLastFailedRequest])

  return {
    ...state,
    execute,
    retry,
    reset,
    isIdle: !state.loading && !state.error && !state.data
  }
}
