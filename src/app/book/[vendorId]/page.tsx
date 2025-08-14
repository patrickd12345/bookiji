'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../../hooks/useAuth'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ADSENSE_APPROVAL_MODE } from '@/lib/adsense'

interface Service {
  id: string
  name: string
  description: string
  duration_minutes: number
  price_cents: number
  category: string
}

interface Vendor {
  id: string
  full_name: string
  email: string
}

export default function BookVendorPage() {
  const params = useParams<{ vendorId: string }>()
  const vendorId = params?.vendorId ?? ''
  const { user } = useAuth()
  
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availabilitySlots, setAvailabilitySlots] = useState<{ date: string; time: string }[]>([])
  const [loading, setLoading] = useState(true)

  const fetchVendorAndServices = useCallback(async () => {
    if (!vendorId) return;
    
    try {
      // Fetch vendor details
      const { data: vendorData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('id', vendorId)
        .eq('role', 'vendor')
        .single()

      // Fetch vendor services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('is_active', true)

      setVendor(vendorData)
      setServices(servicesData || [])
    } catch (error) {
      console.error('Error fetching vendor data:', error)
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  // Fetch availability slots from the server
  const fetchAvailability = useCallback(async () => {
    if (!vendorId) return;
    
    try {
      const res = await fetch('/api/availability/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: vendorId })
      })

      const data = await res.json()

      if (Array.isArray(data.finalSlots)) {
        const slots = data.finalSlots.map((slot: { start_time: string }) => {
          const start = new Date(slot.start_time)
          return {
            date: start.toISOString().split('T')[0],
            time: start.toTimeString().slice(0, 5)
          }
        })
        setAvailabilitySlots(slots)
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
    }
  }, [vendorId])

  useEffect(() => {
    if (!vendorId) return;
    fetchVendorAndServices();
    fetchAvailability();
  }, [vendorId, fetchVendorAndServices, fetchAvailability]);

  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      alert('Please select service, date and time')
      return
    }

    // Skip auth check during AdSense approval
    if (!user && !ADSENSE_APPROVAL_MODE) {
      alert('Please log in to book an appointment')
      return
    }

    try {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user?.id ?? null,
          service: selectedService.name,
          providerId: vendorId,
          location: '',
          date: selectedDate,
          time: selectedTime
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Redirect to payment page
        window.location.href = `/pay/${data.bookingId}?client_secret=${data.clientSecret}`
      } else {
        alert('Booking failed: ' + data.error)
      }
    } catch (error) {
      console.error('Booking error:', error)
      alert('Booking failed')
    }
  }

  // Early returns after all hooks
  if (!vendorId) {
    return <div className="p-8 text-red-600">Invalid vendor id</div>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading vendor...</div>
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Vendor not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Book with {vendor.full_name}
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Book your appointment with {vendor?.full_name || 'this provider'}. You&apos;ll only pay a $1 commitment fee now, with the full payment due after service completion.
          </p>

          {/* Services Selection */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Select Service</h2>
            <div className="grid gap-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedService?.id === service.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedService(service)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{service.name}</h3>
                      <p className="text-gray-600 text-sm">{service.description}</p>
                      <p className="text-sm text-gray-500">{service.duration_minutes} minutes</p>
                    </div>
                    <div className="text-lg font-semibold">
                      ${(service.price_cents / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Date & Time Selection */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Time
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose time</option>
                {availabilitySlots
                  .filter((s) => s.date === selectedDate)
                  .map((s) => (
                    <option key={s.time} value={s.time}>
                      {s.time}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Book Button */}
          <button
            onClick={handleBooking}
            disabled={!selectedService || !selectedDate || !selectedTime}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
          >
            Book Appointment
          </button>
        </div>
      </div>
    </div>
  )
} 