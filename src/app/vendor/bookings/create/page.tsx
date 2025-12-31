'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowserClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'

interface Service {
  id: string
  name: string
  price: number
  duration_minutes: number
}

interface Customer {
  id: string
  full_name: string
  email: string
}

export default function CreateVendorBookingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [vendorId, setVendorId] = useState<string>('')

  useEffect(() => {
    fetchVendorData()
    fetchServices()
    fetchCustomers()
  }, [])

  const fetchVendorData = async () => {
    const supabase = supabaseBrowserClient()
    if (!supabase) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('role', 'vendor')
      .single()

    if (profile) {
      setVendorId(profile.id)
    }
  }

  const fetchServices = async () => {
    const supabase = supabaseBrowserClient()
    if (!supabase || !vendorId) return

    const { data, error } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('provider_id', vendorId)
      .eq('is_active', true)

    if (!error && data) {
      setServices(data as Service[])
    }
  }

  const fetchCustomers = async () => {
    const supabase = supabaseBrowserClient()
    if (!supabase) return

    // Fetch recent customers (those who have booked with this vendor before)
    // For now, we'll fetch all customer profiles - in production, filter by booking history
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'customer')
      .limit(50)

    if (!error && data) {
      setCustomers(data as Customer[])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedService || !selectedCustomer || !selectedDate || !selectedTime) {
      alert('Please fill in all required fields')
      return
    }

    const service = services.find(s => s.id === selectedService)
    if (!service) {
      alert('Invalid service selected')
      return
    }

    // Combine date and time
    const [hours, minutes] = selectedTime.split(':').map(Number)
    const startTime = new Date(selectedDate)
    startTime.setHours(hours, minutes, 0, 0)
    
    const endTime = new Date(startTime)
    endTime.setMinutes(endTime.getMinutes() + (service.duration_minutes || 60))

    setLoading(true)

    try {
      const response = await fetch('/api/vendor/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer,
          serviceId: selectedService,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          amountUSD: service.price || 0,
          notes: notes || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking')
      }

      // Success - redirect to bookings page
      router.push('/vendor/bookings')
    } catch (error) {
      console.error('Error creating booking:', error)
      alert(error instanceof Error ? error.message : 'Failed to create booking')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-4 sm:py-8 max-w-2xl px-4">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Create New Booking</CardTitle>
          <CardDescription>
            Create a booking for a customer. No payment required - customer will confirm.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer">Customer *</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.full_name} ({customer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service Selection */}
            <div className="space-y-2">
              <Label htmlFor="service">Service *</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - ${service.price?.toFixed(2) || '0.00'} ({service.duration_minutes} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined
                  setSelectedDate(date)
                }}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <textarea
                id="notes"
                className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any special instructions or notes..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Booking'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
