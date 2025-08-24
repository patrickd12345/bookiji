'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingSkeleton, ButtonSkeleton } from '@/components/ui/LoadingSkeleton'
import { useOptimisticActionWithTelemetry } from '@/hooks/useOptimisticActionWithTelemetry'
import { useDebouncedClickWithTelemetry } from '@/hooks/useDebouncedClickWithTelemetry'
import { useResilientQuery } from '@/hooks/useResilientQuery'
import { Calendar, Clock, CheckCircle, AlertCircle, Loader2, RotateCcw } from 'lucide-react'

interface RescheduleDetails {
  bookingId: string
  newSlotStart: string
  newSlotEnd: string
  reason?: string
}

interface ResilientRescheduleButtonProps {
  onRescheduleSuccessAction: (rescheduleId: string) => void
  onRescheduleErrorAction: (error: Error) => void
  onRollbackAction: () => void
  rescheduleDetails: RescheduleDetails
  className?: string
  disabled?: boolean
}

export function ResilientRescheduleButton({
  onRescheduleSuccessAction,
  onRescheduleErrorAction,
  onRollbackAction,
  rescheduleDetails,
  className = '',
  disabled = false
}: ResilientRescheduleButtonProps) {
  const [rescheduleStatus, setRescheduleStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle')
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [oldSlot, setOldSlot] = useState<{ start: string; end: string } | null>(null)

  // 1. OPTIMISTIC RESCHEDULE ACTION with TELEMETRY
  const { execute: executeReschedule, status, error, rollback } = useOptimisticActionWithTelemetry({
    action: async () => {
      // Simulate reschedule processing
      const response = await fetch('/api/bookings/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rescheduleDetails)
      })

      if (!response.ok) {
        throw new Error('Reschedule failed')
      }

      const result = await response.json()
      return result.rescheduleId
    },
    onOptimistic: () => {
      setRescheduleStatus('processing')
      setRescheduleId(null)
      // Store old slot for potential rollback
      setOldSlot({
        start: rescheduleDetails.newSlotStart,
        end: rescheduleDetails.newSlotEnd
      })
    },
    onSuccess: (rescheduleId: string) => {
      setRescheduleStatus('success')
      setRescheduleId(rescheduleId)
      onRescheduleSuccessAction(rescheduleId)
    },
    onError: (error: Error) => {
      setRescheduleStatus('failed')
      onRescheduleErrorAction(error)
    },
    onRollback: () => {
      setRescheduleStatus('idle')
      setRescheduleId(null)
      setOldSlot(null)
      onRollbackAction()
    },
    component: 'ResilientRescheduleButton' // Required for telemetry
  })

  // 2. DEBOUNCED CLICK (prevents duplicate reschedules) with TELEMETRY
  const debouncedReschedule = useDebouncedClickWithTelemetry(() => executeReschedule(), {
    delay: 300,
    onDuplicate: () => {
      console.log('Reschedule already in progress, ignoring duplicate click')
    },
    component: 'ResilientRescheduleButton' // Required for telemetry
  })

  // 3. RESILIENT QUERY for reschedule confirmation
  const { data: confirmedReschedule, isLoading: isConfirming } = useResilientQuery({
    key: ['reschedule-confirmation', rescheduleId || ''],
    fetcher: async () => {
      if (!rescheduleId) throw new Error('No reschedule ID')
      
      const response = await fetch(`/api/bookings/reschedule/${rescheduleId}/status`)
      if (!response.ok) throw new Error('Failed to confirm reschedule')
      
      return response.json()
    },
    enabled: !!rescheduleId && rescheduleStatus === 'success',
    retry: { attempts: 3, backoff: 'exponential', delay: 1000 },
    staleTime: 5000
  })

  // 4. LOADING SKELETONS for different states
  if (status === 'optimistic' || rescheduleStatus === 'processing') {
    return (
      <div className="space-y-2">
        <ButtonSkeleton size="lg" className="w-full" />
        <div className="text-center">
          <LoadingSkeleton width={140} height={14} />
        </div>
      </div>
    )
  }

  // 5. SUCCESS STATE with confirmation
  if (rescheduleStatus === 'success') {
    return (
      <div className="space-y-3">
        <Button disabled className="w-full bg-green-600 text-white">
          <CheckCircle className="w-4 h-4 mr-2" />
          Rescheduled Successfully!
        </Button>
        
        {isConfirming && (
          <div className="text-center text-sm text-gray-600">
            <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
            Confirming new slot...
          </div>
        )}
        
        {confirmedReschedule && (
          <div className="text-center text-sm text-green-600">
            ✓ New slot confirmed and locked
          </div>
        )}
        
        <div className="text-xs text-gray-500 text-center">
          New $1 commitment fee applied
        </div>
      </div>
    )
  }

  // 6. ERROR STATE with retry and rollback
  if (rescheduleStatus === 'failed' || error) {
    return (
      <div className="space-y-3">
        <Button 
          onClick={() => debouncedReschedule()}
          variant="destructive"
          className="w-full"
        >
          <AlertCircle className="w-4 h-4 mr-2" />
          Reschedule Failed - Try Again
        </Button>
        
        <div className="text-center text-sm text-red-600">
          {error?.message || 'Something went wrong. Your original booking is intact.'}
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => rollback()}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restore Original
          </Button>
          
          <Button 
            onClick={() => setRescheduleStatus('idle')}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // 7. DEFAULT STATE - Reschedule button
  return (
    <Button
      onClick={() => debouncedReschedule()}
      disabled={disabled || status === 'loading'}
      className={`w-full ${className}`}
      size="lg"
      variant="outline"
    >
      <Calendar className="w-4 h-4 mr-2" />
      Reschedule Appointment
    </Button>
  )
}

// Specialized reschedule button for Bookiji's non-refundable $1 rule
export function BookijiRescheduleButton({
  onSuccess,
  onError,
  onRollback,
  rescheduleDetails,
  className = ''
}: {
  onSuccess: (rescheduleId: string) => void
  onError: (error: Error) => void
  onRollback: () => void
  rescheduleDetails: RescheduleDetails
  className?: string
}) {
  return (
    <ResilientRescheduleButton
      rescheduleDetails={rescheduleDetails}
      onRescheduleSuccessAction={onSuccess}
      onRescheduleErrorAction={onError}
      onRollbackAction={onRollback}
      className={className}
    />
  )
}
