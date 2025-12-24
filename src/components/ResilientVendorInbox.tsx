'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { LoadingSkeleton, CardSkeleton, GridSkeleton } from '@/components/ui/LoadingSkeleton'
import { useOptimisticActionWithTelemetry } from '@/hooks/useOptimisticActionWithTelemetry'
import { useDebouncedClickWithTelemetry } from '@/hooks/useDebouncedClickWithTelemetry'
import { useResilientQuery } from '@/hooks/useResilientQuery'
import { useErrorBoundary } from '@/components/ui/ErrorBoundary'
import { CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react'

interface ServiceRequest {
  id: string
  customer_id: string
  customer_name: string
  service_type: string
  location: string
  details?: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  created_at: string
}

interface ResilientVendorInboxProps {
  vendorId: string
  className?: string
}

export function ResilientVendorInbox({
  vendorId,
  className = ''
}: ResilientVendorInboxProps) {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, Partial<ServiceRequest>>>(new Map())
  const { error, handleError, resetError, hasError } = useErrorBoundary()

  // 1. RESILIENT QUERY for fetching service requests
  const { 
    data: fetchedRequests, 
    isLoading, 
    error: queryError, 
    refetch, 
    retry 
  } = useResilientQuery({
    key: ['vendor-requests', vendorId],
    fetcher: async () => {
      const response = await fetch(`/api/vendor/requests?vendor_id=${vendorId}`)
      if (!response.ok) throw new Error('Failed to fetch requests')
      return response.json()
    },
    retry: { attempts: 3, backoff: 'exponential', delay: 1000 },
    staleTime: 10000, // 10 seconds
    cacheTime: 60000   // 1 minute
  })

  // 2. OPTIMISTIC ACCEPT ACTION with TELEMETRY
  const { execute: executeAccept, status: acceptStatus } = useOptimisticActionWithTelemetry({
    action: async (requestId: string) => {
      const response = await fetch('/api/vendor/requests/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, vendorId })
      })

      if (!response.ok) {
        throw new Error('Failed to accept request')
      }

      return response.json()
    },
    onOptimistic: (requestId: string) => {
      // Optimistically update the request status
      setOptimisticUpdates(prev => new Map(prev).set(requestId, { status: 'accepted' }))
      
      // Update local state immediately
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'accepted' } : req
      ))
    },
    onSuccess: () => {
      // Clear optimistic update
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev)
        newMap.clear()
        return newMap
      })
      
      // Refresh data to ensure consistency
      refetch()
    },
    onError: (error: Error, requestId: string) => {
      // Rollback optimistic update
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(requestId)
        return newMap
      })
      
      // Rollback local state
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'pending' } : req
      ))
      
      handleError(error)
    },
    component: 'ResilientVendorInbox' // Required for telemetry
  })

  // 3. OPTIMISTIC DECLINE ACTION with TELEMETRY
  const { execute: executeDecline, status: declineStatus } = useOptimisticActionWithTelemetry({
    action: async (requestId: string) => {
      const response = await fetch('/api/vendor/requests/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, vendorId })
      })

      if (!response.ok) {
        throw new Error('Failed to decline request')
      }

      return response.json()
    },
    onOptimistic: (requestId: string) => {
      // Optimistically update the request status
      setOptimisticUpdates(prev => new Map(prev).set(requestId, { status: 'declined' }))
      
      // Update local state immediately
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'declined' } : req
      ))
    },
    onSuccess: () => {
      // Clear optimistic update
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev)
        newMap.clear()
        return newMap
      })
      
      // Refresh data to ensure consistency
      refetch()
    },
    onError: (error: Error, requestId: string) => {
      // Rollback optimistic update
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(requestId)
        return newMap
      })
      
      // Rollback local state
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'pending' } : req
      ))
      
      handleError(error)
    },
    component: 'ResilientVendorInbox' // Required for telemetry
  })

  // 4. DEBOUNCED CLICKS (prevents duplicate actions) with TELEMETRY
  const debouncedAccept = useDebouncedClickWithTelemetry(executeAccept, {
    delay: 300,
    onDuplicate: () => {
      console.log('Accept already in progress, ignoring duplicate click')
    },
    component: 'ResilientVendorInbox' // Required for telemetry
  })

  const debouncedDecline = useDebouncedClickWithTelemetry(executeDecline, {
    delay: 300,
    onDuplicate: () => {
      console.log('Decline already in progress, ignoring duplicate click')
    },
    component: 'ResilientVendorInbox' // Required for telemetry
  })

  // 5. UPDATE REQUESTS WHEN DATA CHANGES
  useEffect(() => {
    if (fetchedRequests?.requests) {
      setRequests(fetchedRequests.requests)
    }
  }, [fetchedRequests])

  // 6. ERROR HANDLING
  useEffect(() => {
    if (queryError) {
      handleError(queryError)
    }
  }, [queryError, handleError])

  // 7. LOADING STATE
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Service Requests</h2>
          <LoadingSkeleton width={80} height={32} />
        </div>
        <GridSkeleton rows={3} cols={1} />
      </div>
    )
  }

  // 8. ERROR STATE
  if (hasError) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to load requests
        </h3>
        <p className="text-gray-600 mb-4">
          {error?.message || 'Something went wrong while loading your service requests.'}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={retry} variant="default">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button onClick={resetError} variant="outline">
            Reset
          </Button>
        </div>
      </div>
    )
  }

  // 9. EMPTY STATE
  if (requests.length === 0) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No service requests yet
        </h3>
        <p className="text-gray-600">
          When customers request your services, they&apos;ll appear here.
        </p>
      </div>
    )
  }

  // 10. REQUESTS LIST
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Service Requests ({requests.length})</h2>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {requests.map((request) => {
          const isOptimistic = optimisticUpdates.has(request.id)
          const optimisticStatus = optimisticUpdates.get(request.id)?.status
          const displayStatus = optimisticStatus || request.status

          return (
            <div
              key={request.id}
              className={`p-4 border rounded-lg transition-all ${
                isOptimistic ? 'opacity-75 bg-blue-50' : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {request.customer_name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {request.service_type} • {request.location}
                  </p>
                  {request.details && (
                    <p className="text-sm text-gray-500 mt-1">
                      {request.details}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="ml-4 flex gap-2">
                  {displayStatus === 'pending' && (
                    <>
                      <Button
                        onClick={() => debouncedAccept(request.id)}
                        disabled={acceptStatus === 'loading'}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {acceptStatus === 'loading' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        onClick={() => debouncedDecline(request.id)}
                        disabled={declineStatus === 'loading'}
                        size="sm"
                        variant="outline"
                      >
                        {declineStatus === 'loading' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </Button>
                    </>
                  )}

                  {displayStatus === 'accepted' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Accepted
                    </span>
                  )}

                  {displayStatus === 'declined' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <XCircle className="w-3 h-3 mr-1" />
                      Declined
                    </span>
                  )}
                </div>
              </div>

              {isOptimistic && (
                <div className="mt-2 text-xs text-blue-600">
                  Processing...
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
