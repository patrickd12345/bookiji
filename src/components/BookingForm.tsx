'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Coins, CreditCard, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import TourButton from '@/components/TourButton'

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
}

interface UserCredits {
  balance_cents: number
  balance_dollars: number
}

export default function BookingForm({
  vendorId,
  vendorName,
  serviceName,
  serviceDuration,
  servicePriceCents,
  onBookingComplete
}: BookingFormProps) {
  // Form state
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [notes, setNotes] = useState("")
  
  // UI state
  const [paymentMethod, setPaymentMethod] = useState<"credits" | "card">("card")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [credits, setCredits] = useState<UserCredits | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  
  // Format price for display
  const priceDisplayDollars = (servicePriceCents / 100).toFixed(2)
  const canAffordWithCredits = credits ? credits.balance_cents >= servicePriceCents : false
  
  const loadUserCredits = async () => {
    try {
      const response = await fetch("/api/credits/balance", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setCredits(result.credits)
          if (result.credits.balance_cents >= servicePriceCents) {
            setPaymentMethod("credits")
          }
        }
      }
    } catch (error) {
      console.error("Failed to load credits:", error)
    }
  }

  const loadAvailableSlots = async (date: string) => {
    setLoadingSlots(true)
    try {
      const response = await fetch(`/api/slots/available?date=${date}&vendorId=${vendorId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAvailableSlots(result.slots)
        }
      }
    } catch (error) {
      console.error("Failed to load slots:", error)
    } finally {
      setLoadingSlots(false)
    }
  }

  // Load user credits on component mount
  useEffect(() => {
    loadUserCredits()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-start tour for first-time users (disabled for now)
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setRunTour(true)
  //   }, 1000)
  //   return () => clearTimeout(timer)
  // }, [])

  // Listen for tour start events
  useEffect(() => {
    const handleStartTour = () => {
      // setRunTour(true) // This line is removed as per the edit hint
    }
    
    window.addEventListener('start-bookiji-tour', handleStartTour)
    return () => window.removeEventListener('start-bookiji-tour', handleStartTour)
  }, [])

  // Load available slots when date changes
  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots(selectedDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // Validate form
      const requiredFields = {
        'date': selectedDate,
        'time slot': selectedTime,
        'full name': customerName,
        'email': customerEmail
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([, value]) => !value)
        .map(([field]) => field);

      if (missingFields.length > 0) {
        const missingFieldsText = missingFields.join(', ');
        setError(`Please fill in all required fields: ${missingFieldsText}`);
        setIsSubmitting(false);
        return;
      }

      if (paymentMethod === "credits" && !canAffordWithCredits) {
        setError("Insufficient credit balance");
        setIsSubmitting(false);
        return;
      }

      // Create booking
      const response = await fetch("/api/bookings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vendorId,
          serviceId: "demo-service-" + serviceName.toLowerCase().replace(" ", "-"),
          slotId: selectedTime,
          slotStart: `${selectedDate}T${selectedTime}:00`,
          slotEnd: `${selectedDate}T${selectedTime}:00`,
          customerName,
          customerEmail,
          customerPhone,
          notes,
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create booking");
      }

      const bookingId = data.booking.id;

      if (paymentMethod === "credits") {
        await handleCreditPayment(bookingId);
      }

      setSuccess(`Booking confirmed! Reference: ${bookingId}`);
      onBookingComplete?.(bookingId);
      resetForm();
    } catch (error) {
      console.error("Failed to create booking:", error);
      setError("Failed to create booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreditPayment = async (bookingId: string) => {
    try {
      const response = await fetch("/api/credits/use", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "demo-user-123",
          amountCents: servicePriceCents,
          description: `Payment for ${serviceName} booking`,
          bookingId
        })
      })

      if (response.ok) {
        // Reload credits to show updated balance
        await loadUserCredits()
      }
    } catch (error) {
      console.error("Failed to process credit payment:", error)
    }
  }

  const resetForm = () => {
    setSelectedDate("")
    setSelectedTime("")
    setCustomerName("")
    setCustomerEmail("")
    setCustomerPhone("")
    setNotes("")
    setError("")
    setSuccess("")
    setAvailableSlots([])
  }

  return (
    <div className="relative booking-form-container">
      {/* Guided Tour Component - Disabled for now */}
      {/* <GuidedTour 
        steps={BOOKING_TOUR_STEPS}
        run={runTour}
        onComplete={() => setRunTour(false)}
        onSkip={() => setRunTour(false)}
        autoStart={true}
      /> */}
      
      {/* Tour Button */}
      <div className="absolute top-4 right-4 z-10">
        <TourButton 
          variant="help" 
          onStartTour={() => {}} // setRunTour(true) // This line is removed as per the edit hint
        />
      </div>
      
      <Card className="w-full max-w-2xl mx-auto service-selector">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Book {serviceName}
          </CardTitle>
          <CardDescription>
            {vendorName} • {serviceDuration} minutes • ${priceDisplayDollars}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}
          {success && (
            <div role="status" className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              {success}
            </div>
          )}
          <form role="form" className="space-y-6 booking-form" onSubmit={handleSubmit}>
            <div className="space-y-2 date-picker-container">
              <Label htmlFor="date">Select Date *</Label>
              <input
                type="date"
                id="date"
                min={new Date().toISOString().split("T")[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {selectedDate && (
              <div className="space-y-2 time-slots-container">
                <Label>Available Time Slots *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {loadingSlots ? (
                    <div role="progressbar" className="col-span-full flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : availableSlots?.length === 0 ? (
                    <div className="col-span-full flex items-center justify-center py-4 text-gray-600">
                      No available slots for this date
                    </div>
                  ) : (
                    availableSlots?.map((slot) => (
                      <Button
                        key={slot.id}
                        type="button"
                        variant={selectedTime === slot.start ? "default" : "outline"}
                        className="p-3 h-auto flex flex-col items-center"
                        onClick={() => setSelectedTime(slot.start)}
                        disabled={!slot.available}
                      >
                        <Clock className="h-4 w-4 mb-1" />
                        <span className="text-sm">{slot.start}</span>
                      </Button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 customer-info-form">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-3 commitment-fee-info">
              <Label>Payment Method *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={paymentMethod === "credits" ? "default" : "outline"}
                  className="p-4 h-auto flex flex-col items-center gap-2"
                  onClick={() => setPaymentMethod("credits")}
                  disabled={!credits}
                >
                  <Coins className="h-5 w-5" />
                  <div className="text-center">
                    <div className="font-medium">Pay with Credits</div>
                    <div className="text-sm text-gray-600">
                      {credits ? `Balance: $${credits.balance_dollars}` : "Loading..."}
                    </div>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  className="p-4 h-auto flex flex-col items-center gap-2"
                  onClick={() => setPaymentMethod("card")}
                >
                  <CreditCard className="h-5 w-5" />
                  <div className="text-center">
                    <div className="font-medium">Pay with Card</div>
                    <div className="text-sm text-gray-600">${priceDisplayDollars}</div>
                  </div>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <textarea
                id="notes"
                className="w-full min-h-[100px] p-3 border rounded-lg"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests or notes for the service provider..."
              />
            </div>

            <Button
              type="submit"
              className="w-full py-3 text-lg book-now-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Confirm Booking - ${priceDisplayDollars}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Floating Tour Button for mobile */}
      <TourButton 
        variant="floating" 
        className="md:hidden" 
        onStartTour={() => {}} // setRunTour(true) // This line is removed as per the edit hint
      />
    </div>
  )
}
