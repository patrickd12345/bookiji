'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, Clock, DollarSign, MessageSquare, Calendar, AlertCircle } from 'lucide-react'

interface Service {
  id: string
  name: string
  price_cents: number
  duration_minutes: number
  category: string
}

interface ShoutOutDetails {
  id: string
  service_type: string
  description?: string
  radius_km: number
  status: string
  expires_at: string
  created_at: string
}

interface ShoutOutResponseModalProps {
  isOpen: boolean
  shoutOutId: string
  onClose: () => void
  onSuccess: () => void
}

export default function ShoutOutResponseModal({
  isOpen,
  shoutOutId,
  onClose,
  onSuccess
}: ShoutOutResponseModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [shoutOutDetails, setShoutOutDetails] = useState<ShoutOutDetails | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<string>('')
  const [slotDate, setSlotDate] = useState('')
  const [slotStartTime, setSlotStartTime] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load shout-out details and services
  useEffect(() => {
    if (!isOpen || !shoutOutId) return

    const loadData = async () => {
      try {
        // Fetch shout-out details
        const shoutOutResponse = await fetch(`/api/vendors/shout-outs/${shoutOutId}/reply`)
        if (!shoutOutResponse.ok) {
          throw new Error('Failed to fetch shout-out details')
        }
        const shoutOutData = await shoutOutResponse.json()
        setShoutOutDetails(shoutOutData.shout_out)

        // Fetch vendor services
        const servicesResponse = await fetch('/api/vendor/services')
        if (servicesResponse.ok) {
          const servicesData = await servicesResponse.json()
          const matchingServices = servicesData.services?.filter(
            (s: Service) => s.category === shoutOutData.shout_out.service_type
          ) || []
          setServices(matchingServices)
          
          // Auto-select first service if available
          if (matchingServices.length > 0) {
            setSelectedService(matchingServices[0].id)
            setCustomPrice((matchingServices[0].price_cents / 100).toFixed(2))
          }
        }

        // Set default date to tomorrow
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        setSlotDate(tomorrow.toISOString().split('T')[0])
        setSlotStartTime('09:00')

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      }
    }

    loadData()
  }, [isOpen, shoutOutId])

  // Focus management
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        modalRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedService || !slotDate || !slotStartTime || !customPrice) {
      setError('Please fill in all required fields')
      return
    }

    const selectedServiceObj = services.find(s => s.id === selectedService)
    if (!selectedServiceObj) {
      setError('Selected service not found')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Calculate slot times
      const slotStart = new Date(`${slotDate}T${slotStartTime}:00`)
      const slotEnd = new Date(slotStart.getTime() + selectedServiceObj.duration_minutes * 60000)

      const response = await fetch(`/api/vendors/shout-outs/${shoutOutId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service_id: selectedService,
          slot_start: slotStart.toISOString(),
          slot_end: slotEnd.toISOString(),
          price_cents: Math.round(parseFloat(customPrice) * 100),
          message: message.trim() || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to submit offer')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit offer')
    } finally {
      setLoading(false)
    }
  }

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  // Generate time slots
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(timeString)
      }
    }
    return slots
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Respond to Shout-Out
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Shout-out details */}
          {shoutOutDetails && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Request Details</h3>
              <p className="text-blue-800 text-sm mb-1">
                <strong>Service:</strong> {shoutOutDetails.service_type}
              </p>
              {shoutOutDetails.description && (
                <p className="text-blue-800 text-sm">
                  <strong>Details:</strong> "{shoutOutDetails.description}"
                </p>
              )}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Service selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Service *
            </label>
            <select
              value={selectedService}
              onChange={(e) => {
                setSelectedService(e.target.value)
                const service = services.find(s => s.id === e.target.value)
                if (service) {
                  setCustomPrice((service.price_cents / 100).toFixed(2))
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            >
              <option value="">Choose a service...</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.duration_minutes}min - ${(service.price_cents / 100).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Date selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Date *
            </label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Time selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time *
            </label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <select
                value={slotStartTime}
                onChange={(e) => setSlotStartTime(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              >
                {generateTimeSlots().map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom pricing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Price *
            </label>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                min="1"
                step="0.01"
                placeholder="0.00"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Suggest a competitive price for this specific request
            </p>
          </div>

          {/* Optional message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message to Customer (Optional)
            </label>
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-gray-400 mt-2" />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message to stand out..."
                rows={3}
                maxLength={500}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={loading}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {500 - message.length} characters remaining
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !selectedService || !slotDate || !slotStartTime || !customPrice}
            className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Sending...
              </>
            ) : (
              'Send Offer'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
