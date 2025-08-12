'use client'

import { useState, useEffect, useCallback } from 'react'
import { InlineLoader } from '@/components/ui/LoadingSpinner'
import { ValidationError } from '@/components/ui/ErrorDisplay'
import { SuccessMessage } from '@/components/ui/StatusMessage'
import { useAsyncOperation } from '@/hooks/useAsyncState'
import { useGuidedTour } from '@/components/guided-tours/GuidedTourProvider'
import { customerBookingSteps, customerBookingTourId } from '@/tours/customerBooking'

interface BookingFormProps {
  vendorId: string
  vendorName: string
  serviceName: string
  serviceDuration: number
  servicePriceCents: number
  onBookingComplete?: (bookingId: string) => void
}

interface TimeSlot {
  id: string
  start: string
  end: string
  available: boolean
  vendor_id: string
  time: string
  duration: number
}

interface UserCredits {
  balance_cents: number
  balance_dollars: number
}

export default function BookingForm({
  vendorId,
  vendorName,
  serviceName,
  servicePriceCents,
  onBookingComplete
}: BookingFormProps) {
  const { startTour, hasCompletedTour } = useGuidedTour()
  // Form state
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [notes, setNotes] = useState("")
  
  // UI state
  const [paymentMethod, setPaymentMethod] = useState<"credits" | "card">("card")
  const [credits, setCredits] = useState<UserCredits | null>(null)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [requestBroadcasted, setRequestBroadcasted] = useState(false)
  const [serviceRequestId, setServiceRequestId] = useState<string | null>(null)
  
  // Use the new async operation hooks
  const creditsOperation = useAsyncOperation<UserCredits>()
  const slotsOperation = useAsyncOperation<TimeSlot[]>()
  const bookingOperation = useAsyncOperation<{ success: boolean; bookingId?: string; error?: string }>()

  // Format price for display
  const priceDisplayDollars = (servicePriceCents / 100).toFixed(2)
  const canAffordWithCredits = credits ? credits.balance_cents >= servicePriceCents : false

  useEffect(() => {
    if (!hasCompletedTour(customerBookingTourId)) {
      startTour(customerBookingTourId, customerBookingSteps)
    }
  }, [hasCompletedTour, startTour])
  
  const loadUserCredits = useCallback(async () => {
    try {
      const result = await creditsOperation.run(async () => {
        const response = await fetch("/api/credits/balance", {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        })

        if (!response.ok) {
          throw new Error('Failed to load credits')
        }

        const result = await response.json()
        if (result.success) {
          return result.credits
        } else {
          throw new Error(result.error || 'Failed to load credits')
        }
      })

      if (result.success && result.data) {
        setCredits(result.data)
        if (result.data.balance_cents >= servicePriceCents) {
          setPaymentMethod("credits")
        }
      }
    } catch (error) {
      console.error("Failed to load credits:", error)
    }
  }, [creditsOperation, servicePriceCents])

  const createServiceRequest = useCallback(
    async (date: string) => {
      try {
        const response = await fetch("/api/service-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendor_id: vendorId,
            service_name: serviceName,
            date
          })
        })

        if (response.ok) {
          const data = await response.json()
          setRequestBroadcasted(true)
          if (data?.id || data?.requestId) {
            setServiceRequestId(data.id || data.requestId)
          }
        }
      } catch (error) {
        console.error("Failed to create service request:", error)
      }
    },
    [serviceName, vendorId]
  )

  const loadAvailableSlots = useCallback(async (date: string) => {
    if (!date) return

    try {
      const result = await slotsOperation.run(async () => {
        const response = await fetch(`/api/availability/search?date=${date}&vendor_id=${vendorId}`)
        
        if (!response.ok) {
          throw new Error('Failed to load available slots')
        }

        const data = await response.json()
        return data.slots || []
      })

      if (result.success && result.data) {
        setAvailableSlots(result.data)
        if (result.data.length === 0) {
          await createServiceRequest(date)
        } else {
          setRequestBroadcasted(false)
          setServiceRequestId(null)
        }
      }
    } catch (error) {
      console.error("Failed to load available slots:", error)
    }
  }, [slotsOperation, vendorId, createServiceRequest])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedDate || !selectedTime || !customerName || !customerEmail) {
      return
    }

    try {
      const result = await bookingOperation.run(async () => {
        const response = await fetch("/api/bookings/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendor_id: vendorId,
            service_name: serviceName,
            scheduled_for: `${selectedDate}T${selectedTime}`,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            notes,
            payment_method: paymentMethod,
            price_cents: servicePriceCents
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create booking')
        }

        const data = await response.json()
        return data
      })

      if (result.success && result.data) {
        onBookingComplete?.(result.data)
      }
    } catch (error) {
      console.error("Failed to create booking:", error)
    }
  }, [
    selectedDate, selectedTime, customerName, customerEmail, customerPhone, notes,
    paymentMethod, servicePriceCents, vendorId, serviceName, onBookingComplete,
    bookingOperation
  ])

  // Load credits on mount
  useEffect(() => {
    loadUserCredits()
  }, [loadUserCredits])

  // Load slots when date changes
  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots(selectedDate)
    }
  }, [selectedDate, loadAvailableSlots])

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-2" data-tour="provider-selection">
        <span className="text-sm text-gray-600">Provider: {vendorName}</span>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Book {serviceName}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date and Time Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              data-tour="date-picker"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time
            </label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={!selectedDate}
              data-tour="time-picker"
            >
              <option value="">Select a date first</option>
              {availableSlots.map((slot) => (
                <option key={slot.time} value={slot.time}>
                  {slot.time} ({slot.duration} min)
                </option>
              ))}
            </select>
            {requestBroadcasted && (
              <p className="mt-2 text-sm text-yellow-700">
                No openings today—request broadcast to nearby vendors.
                <a
                  href={serviceRequestId ? `/service-requests/${serviceRequestId}` : '/service-requests'}
                  className="ml-1 underline text-blue-600"
                >
                  Track your pending request
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Customer Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone (Optional)
          </label>
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Any special requests or notes..."
          />
        </div>

        {/* Payment Method */}
        <div data-tour="payment-form">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="card"
                checked={paymentMethod === "card"}
                onChange={(e) => setPaymentMethod(e.target.value as "credits" | "card")}
                className="mr-2"
              />
              <span>Credit/Debit Card</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                value="credits"
                checked={paymentMethod === "credits"}
                onChange={(e) => setPaymentMethod(e.target.value as "credits" | "card")}
                className="mr-2"
                disabled={!canAffordWithCredits}
              />
              <span>
                Credits (${credits ? (credits.balance_cents / 100).toFixed(2) : '0.00'})
                {!canAffordWithCredits && (
                  <span className="text-red-500 text-sm ml-2">
                    Insufficient balance
                  </span>
                )}
              </span>
            </label>
          </div>
        </div>

        {/* Price Display */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-900">Total Price:</span>
            <span className="text-2xl font-bold text-blue-600">${priceDisplayDollars}</span>
          </div>
          {paymentMethod === "credits" && (
            <p className="text-sm text-gray-600 mt-1">
              Will be deducted from your credits
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={bookingOperation.loading || !selectedDate || !selectedTime || !customerName || !customerEmail}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          data-tour="submit-booking"
        >
          {bookingOperation.loading ? (
            <InlineLoader text="Creating booking..." />
          ) : (
            <>
              <span>Book Appointment</span>
              <span className="ml-2">📅</span>
            </>
          )}
        </button>
      </form>

      {/* Status Messages */}
      {creditsOperation.error && (
        <ValidationError 
          error={creditsOperation.error}
          className="mt-4"
        />
      )}
      
      {slotsOperation.error && (
        <ValidationError 
          error={slotsOperation.error}
          className="mt-4"
        />
      )}
      
      {bookingOperation.error && (
        <ValidationError 
          error={bookingOperation.error}
          className="mt-4"
        />
      )}
      
      {bookingOperation.success && (
        <SuccessMessage 
          message="Booking created successfully!"
          className="mt-4"
          autoDismiss
        />
      )}
    </div>
  )
}
