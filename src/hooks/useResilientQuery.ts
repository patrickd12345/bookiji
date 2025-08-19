import { useState, useEffect, useCallback, useRef } from 'react'

interface UseResilientQueryOptions<T> {
  key: string | string[]
  fetcher: () => Promise<T>
  retry?: {
    attempts: number
    backoff: 'exponential' | 'linear' | 'fixed'
    delay?: number
  }
  staleTime?: number
  cacheTime?: number
  enabled?: boolean
}

interface UseResilientQueryReturn<T> {
  data: T | null
  error: Error | null
  isLoading: boolean
  isStale: boolean
  refetch: () => Promise<void>
  retry: () => Promise<void>
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  isStale: boolean
}

const queryCache = new Map<string, CacheEntry<any>>()

export function useResilientQuery<T>({
  key,
  fetcher,
  retry = { attempts: 3, backoff: 'exponential', delay: 1000 },
  staleTime = 30000, // 30 seconds
  cacheTime = 300000, // 5 minutes
  enabled = true
}: UseResilientQueryOptions<T>): UseResilientQueryReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isStale, setIsStale] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const cacheKey = Array.isArray(key) ? key.join(':') : key

  const calculateDelay = useCallback((attempt: number): number => {
    switch (retry.backoff) {
      case 'exponential':
        return retry.delay! * Math.pow(2, attempt)
      case 'linear':
        return retry.delay! * (attempt + 1)
      case 'fixed':
        return retry.delay!
      default:
        return retry.delay!
    }
  }, [retry])

  const executeQuery = useCallback(async (isRetry = false): Promise<void> => {
    if (!enabled) return

    try {
      setIsLoading(true)
      setError(null)

      // Check cache first
      const cached = queryCache.get(cacheKey)
      if (cached && !isRetry) {
        const age = Date.now() - cached.timestamp
        if (age < cacheTime) {
          setData(cached.data)
          setIsStale(age > staleTime)
          setIsLoading(false)
          return
        }
      }

      // Abort previous request if still running
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()
      const result = await fetcher()

      // Cache successful result
      queryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        isStale: false
      })

      setData(result)
      setIsStale(false)
      setAttempts(0)

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return // Request was aborted
      }

      const error = err instanceof Error ? err : new Error('Query failed')
      setError(error)

      // Retry logic
      if (attempts < retry.attempts && !isRetry) {
        const delay = calculateDelay(attempts)
        setTimeout(() => {
          setAttempts(prev => prev + 1)
          executeQuery(true)
        }, delay)
      }
    } finally {
      setIsLoading(false)
    }
  }, [key, fetcher, retry, staleTime, cacheTime, enabled, attempts, cacheKey, calculateDelay])

  const refetch = useCallback(async (): Promise<void> => {
    setAttempts(0)
    await executeQuery()
  }, [executeQuery])

  const retryQuery = useCallback(async (): Promise<void> => {
    setAttempts(0)
    await executeQuery(true)
  }, [executeQuery])

  useEffect(() => {
    executeQuery()
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [executeQuery])

  // Mark as stale after staleTime
  useEffect(() => {
    if (!data) return

    const timer = setTimeout(() => {
      setIsStale(true)
    }, staleTime)

    return () => clearTimeout(timer)
  }, [data, staleTime])

  // Clean up old cache entries
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of queryCache.entries()) {
        if (now - entry.timestamp > cacheTime) {
          queryCache.delete(key)
        }
      }
    }, 60000) // Clean up every minute

    return () => clearInterval(cleanup)
  }, [cacheTime])

  return {
    data,
    error,
    isLoading,
    isStale,
    refetch,
    retry: retryQuery
  }
}
