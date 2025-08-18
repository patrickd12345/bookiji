'use client'

import React, { useState, useEffect } from 'react'
import { Star, MapPin, Clock, DollarSign, MessageSquare, AlertTriangle, RefreshCw } from 'lucide-react'

interface Offer {
  id: string
  shout_out_id: string
  vendor_id: string
  vendor_name: string
  vendor_rating: number
  vendor_total_reviews: number
  service_id: string
  service_name: string
  slot_start: string
  slot_end: string
  price_cents: number
  message?: string
  status: string
  distance_km: number
  score: number
  created_at: string
}

interface ShoutOutOffersProps {
  shoutOutId: string
  expiresAt: string
  onOfferAccept: (offerId: string) => Promise<void>
  onExpandRadius: () => void
  refreshInterval?: number
}

export default function ShoutOutOffers({
  shoutOutId,
  expiresAt,
  onOfferAccept,
  onExpandRadius,
  refreshInterval = 10000 // 10 seconds
}: ShoutOutOffersProps) {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null)
  const [hasExpired, setHasExpired] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  // Calculate time remaining
  useEffect(() => {
    const updateTimeRemaining = () => {
      const now = new Date()
      const expires = new Date(expiresAt)
      const diff = expires.getTime() - now.getTime()

      if (diff <= 0) {
        setHasExpired(true)
        setTimeRemaining('Expired')
        return
      }

      const minutes = Math.floor(diff / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimeRemaining()
    const timer = setInterval(updateTimeRemaining, 1000)
    return () => clearInterval(timer)
  }, [expiresAt])

  // Fetch offers
  const fetchOffers = async () => {
    try {
      const response = await fetch(`/api/shout-outs/${shoutOutId}/offers`)
      if (!response.ok) {
        throw new Error('Failed to fetch offers')
      }
      const data = await response.json()
      
      if (data.success) {
        setOffers(data.offers || [])
        setHasExpired(data.has_expired || false)
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch offers')
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchOffers()
    
    if (!hasExpired && refreshInterval > 0) {
      const interval = setInterval(fetchOffers, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [shoutOutId, hasExpired, refreshInterval])

  // Handle offer acceptance
  const handleAcceptOffer = async (offerId: string) => {
    setAcceptingOfferId(offerId)
    try {
      await onOfferAccept(offerId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept offer')
    } finally {
      setAcceptingOfferId(null)
    }
  }

  // Format price
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  // Format time slot
  const formatTimeSlot = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    let dateStr = ''
    if (startDate.toDateString() === today.toDateString()) {
      dateStr = 'Today'
    } else if (startDate.toDateString() === tomorrow.toDateString()) {
      dateStr = 'Tomorrow'
    } else {
      dateStr = startDate.toLocaleDateString()
    }

    const timeStr = `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    return `${dateStr}, ${timeStr}`
  }

  // Render stars
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
            aria-hidden="true"
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">
          {rating.toFixed(1)}
        </span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" aria-hidden="true" />
          <span className="ml-2 text-gray-600">Loading offers...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="flex items-center gap-2 text-red-600 mb-4">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <span className="font-medium">Error loading offers</span>
        </div>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button
          onClick={fetchOffers}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with timer */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Vendor Offers ({offers.length})
          </h3>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" aria-hidden="true" />
            <span className={`text-sm font-medium ${hasExpired ? 'text-red-600' : 'text-gray-700'}`}>
              {hasExpired ? 'Expired' : `${timeRemaining} remaining`}
            </span>
          </div>
        </div>
      </div>

      {/* Offers list */}
      {offers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          {hasExpired ? (
            <div className="space-y-4">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto" aria-hidden="true" />
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Shout-Out Expired
                </h4>
                <p className="text-gray-600 mb-4">
                  No offers were received before the 30-minute deadline.
                </p>
                <button
                  onClick={onExpandRadius}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Expand Search Radius
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <RefreshCw className="h-12 w-12 text-gray-400 mx-auto animate-pulse" aria-hidden="true" />
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Waiting for Offers
                </h4>
                <p className="text-gray-600 mb-4">
                  We've notified nearby providers. Offers typically arrive within 5-15 minutes.
                </p>
                <button
                  onClick={onExpandRadius}
                  className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Expand Radius Now
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="space-y-4">
                {/* Vendor info */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {offer.vendor_name}
                      </h4>
                      <div className="flex items-center gap-2">
                        {renderStars(offer.vendor_rating)}
                        <span className="text-sm text-gray-500">
                          ({offer.vendor_total_reviews} reviews)
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {offer.service_name}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      <span>{offer.distance_km} km away</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {formatPrice(offer.price_cents)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Score: {offer.score}
                    </div>
                  </div>
                </div>

                {/* Time slot */}
                <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <span>{formatTimeSlot(offer.slot_start, offer.slot_end)}</span>
                </div>

                {/* Vendor message */}
                {offer.message && (
                  <div className="flex items-start gap-2 text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
                    <MessageSquare className="h-4 w-4 mt-0.5 text-blue-600" aria-hidden="true" />
                    <span>"{offer.message}"</span>
                  </div>
                )}

                {/* Accept button */}
                <button
                  onClick={() => handleAcceptOffer(offer.id)}
                  disabled={acceptingOfferId === offer.id || hasExpired}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {acceptingOfferId === offer.id ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4" aria-hidden="true" />
                      Accept Offer
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
