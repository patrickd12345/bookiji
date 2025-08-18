'use client'

import React, { useState, useEffect } from 'react'
import { Clock, MapPin, MessageSquare, DollarSign, Calendar, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import VendorNotificationToast from './VendorNotificationToast'

interface VendorShoutOut {
  id: string
  service_type: string
  description?: string
  radius_km: number
  status: string
  expires_at: string
  created_at: string
  response_status: string
  notified_at: string
  distance_km: number
  existing_offer?: {
    id: string
    price_cents: number
    status: string
    created_at: string
  }
}

interface Service {
  id: string
  name: string
  price_cents: number
  duration_minutes: number
  category: string
}

export default function ShoutOutDashboard() {
  const [shoutOuts, setShoutOuts] = useState<VendorShoutOut[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedShoutOut, setSelectedShoutOut] = useState<string | null>(null)
  const [responding, setResponding] = useState(false)
  const [vendorId, setVendorId] = useState<string | null>(null)

  // Fetch shout-outs
  const fetchShoutOuts = async () => {
    try {
      const response = await fetch('/api/vendors/shout-outs')
      if (!response.ok) {
        throw new Error('Failed to fetch shout-outs')
      }
      const data = await response.json()
      
      if (data.success) {
        setShoutOuts(data.shout_outs || [])
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shout-outs')
    }
  }

  // Get current vendor ID
  const fetchVendorId = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setVendorId(data.user?.id)
      }
    } catch (err) {
      console.error('Failed to fetch vendor ID:', err)
    }
  }

  // Fetch vendor services
  const fetchServices = async () => {
    try {
      const response = await fetch('/api/vendor/services')
      if (!response.ok) {
        throw new Error('Failed to fetch services')
      }
      const data = await response.json()
      
      if (data.success) {
        setServices(data.services || [])
      }
    } catch (err) {
      console.error('Failed to fetch services:', err)
      // Continue without services
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchShoutOuts(), fetchServices(), fetchVendorId()])
      setLoading(false)
    }
    
    loadData()
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchShoutOuts, 30000)
    return () => clearInterval(interval)
  }, [])

  // Format time remaining
  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = expires.getTime() - now.getTime()

    if (diff <= 0) return 'Expired'

    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  // Format price
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  // Get status badge
  const getStatusBadge = (status: string, hasOffer: boolean) => {
    if (hasOffer) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3" />
          Responded
        </span>
      )
    }

    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3" />
            New
          </span>
        )
      case 'viewed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3" />
            Viewed
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" aria-hidden="true" />
          <span className="ml-2 text-gray-600">Loading shout-outs...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="flex items-center gap-2 text-red-600 mb-4">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
          <span className="font-medium">Error loading shout-outs</span>
        </div>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null)
            fetchShoutOuts()
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Real-time notifications */}
      {vendorId && (
        <VendorNotificationToast 
          vendorId={vendorId} 
          enabled={true}
        />
      )}
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Shout-Out Requests</h2>
            <p className="text-gray-600 mt-1">
              Customer requests for your services
            </p>
          </div>
          <button
            onClick={fetchShoutOuts}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Shout-outs list */}
      {shoutOuts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No shout-outs available
          </h3>
          <p className="text-gray-600">
            Customers will send shout-outs when they can't find providers for their needs.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {shoutOuts.map((shoutOut) => (
            <ShoutOutCard
              key={shoutOut.id}
              shoutOut={shoutOut}
              services={services.filter(s => s.category === shoutOut.service_type)}
              onRespond={() => setSelectedShoutOut(shoutOut.id)}
              getTimeRemaining={getTimeRemaining}
              getStatusBadge={getStatusBadge}
              formatPrice={formatPrice}
            />
          ))}
        </div>
      )}

      {/* Response Modal */}
      {selectedShoutOut && (
        <ShoutOutResponseModal
          shoutOutId={selectedShoutOut}
          services={services.filter(s => {
            const shoutOut = shoutOuts.find(so => so.id === selectedShoutOut)
            return shoutOut ? s.category === shoutOut.service_type : false
          })}
          onClose={() => setSelectedShoutOut(null)}
          onSuccess={() => {
            setSelectedShoutOut(null)
            fetchShoutOuts()
          }}
        />
      )}
    </div>
  )
}

// Separate component for shout-out cards
interface ShoutOutCardProps {
  shoutOut: VendorShoutOut
  services: Service[]
  onRespond: () => void
  getTimeRemaining: (expiresAt: string) => string
  getStatusBadge: (status: string, hasOffer: boolean) => React.ReactNode
  formatPrice: (cents: number) => string
}

function ShoutOutCard({
  shoutOut,
  services,
  onRespond,
  getTimeRemaining,
  getStatusBadge,
  formatPrice
}: ShoutOutCardProps) {
  const hasOffer = !!shoutOut.existing_offer
  const timeRemaining = getTimeRemaining(shoutOut.expires_at)
  const isExpired = timeRemaining === 'Expired'

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {shoutOut.service_type}
              </h3>
              {getStatusBadge(shoutOut.response_status, hasOffer)}
            </div>
            {shoutOut.description && (
              <p className="text-gray-600 mb-2">"{shoutOut.description}"</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{shoutOut.distance_km} km away</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span className={isExpired ? 'text-red-600' : 'text-gray-500'}>
                  {isExpired ? 'Expired' : `${timeRemaining} remaining`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Existing offer */}
        {hasOffer && shoutOut.existing_offer && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-green-900">Your Offer</h4>
                <p className="text-green-700 text-sm">
                  Submitted {new Date(shoutOut.existing_offer.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-green-600">
                  {formatPrice(shoutOut.existing_offer.price_cents)}
                </div>
                <div className="text-sm text-green-700 capitalize">
                  {shoutOut.existing_offer.status}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Available services */}
        {!hasOffer && services.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Your matching services:</h4>
            <div className="grid gap-2">
              {services.slice(0, 3).map((service) => (
                <div key={service.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{service.name}</span>
                  <span className="font-medium text-gray-900">
                    {formatPrice(service.price_cents)}
                  </span>
                </div>
              ))}
              {services.length > 3 && (
                <p className="text-sm text-gray-500">
                  +{services.length - 3} more services
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action button */}
        {!hasOffer && !isExpired && (
          <button
            onClick={onRespond}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Respond with Offer
          </button>
        )}
      </div>
    </div>
  )
}

// Response modal component (placeholder)
interface ShoutOutResponseModalProps {
  shoutOutId: string
  services: Service[]
  onClose: () => void
  onSuccess: () => void
}

function ShoutOutResponseModal({
  shoutOutId,
  services,
  onClose,
  onSuccess
}: ShoutOutResponseModalProps) {
  // This would be a full modal component for creating offers
  // For now, just a placeholder
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Respond to Shout-Out</h3>
        <p className="text-gray-600 mb-4">
          Full response modal would go here with form for:
        </p>
        <ul className="text-sm text-gray-600 space-y-1 mb-4">
          <li>• Service selection</li>
          <li>• Time slot picker</li>
          <li>• Custom pricing</li>
          <li>• Optional message</li>
        </ul>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSuccess()
              // Would submit offer here
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Send Offer
          </button>
        </div>
      </div>
    </div>
  )
}
