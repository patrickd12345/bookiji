'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ShoutOutConsentModal from './ShoutOutConsentModal'
import ShoutOutOffers from './ShoutOutOffers'
import { useShoutOut } from '@/hooks/useShoutOut'
import { useShoutOutConfig } from '@/hooks/useShoutOutConfig'

interface ShoutOutFlowProps {
  searchQuery: string
  location: string
  latitude: number
  longitude: number
  serviceCategory: string
  radius?: number
}

export default function ShoutOutFlow({
  searchQuery,
  location,
  latitude,
  longitude,
  serviceCategory,
  radius = 10
}: ShoutOutFlowProps) {
  const router = useRouter()
  const [showConsentModal, setShowConsentModal] = useState(true)
  const [showOffers, setShowOffers] = useState(false)
  const { shoutOut, loading, error, createShoutOut, acceptOffer, reset } = useShoutOut()
  const { config } = useShoutOutConfig()

  // Don't show shout-out flow if system is disabled
  if (config && !config.enabled) {
    return null
  }

  // Handle user consent to create shout-out
  const handleConsent = useCallback(async () => {
    try {
      const result = await createShoutOut({
        service_type: serviceCategory,
        description: `Looking for: ${searchQuery}`,
        latitude,
        longitude,
        radius_km: config?.default_radius_km || radius
      })

      if (result) {
        setShowConsentModal(false)
        setShowOffers(true)
      }
    } catch (err) {
      console.error('Failed to create shout-out:', err)
      // Error is handled by the hook
    }
  }, [createShoutOut, serviceCategory, searchQuery, latitude, longitude, radius, config])

  // Handle offer acceptance
  const handleOfferAccept = useCallback(async (offerId: string) => {
    if (!shoutOut) return

    try {
      const result = await acceptOffer(shoutOut.id, offerId)
      
      if (result) {
        // Navigate to booking confirmation page
        router.push(`/bookings/${result.booking_id}`)
      }
    } catch (err) {
      console.error('Failed to accept offer:', err)
      // Error is handled by the hook
    }
  }, [shoutOut, acceptOffer, router])

  // Handle expanding search radius
  const handleExpandRadius = useCallback(() => {
    setShowOffers(false)
    setShowConsentModal(false)
    reset()
    
    // Redirect back to search with expanded radius
    const params = new URLSearchParams({
      query: searchQuery,
      location: location,
              radius: Math.min(radius * 2, config?.max_radius_km || 100).toString(), // Double radius, max allowed
      service_category: serviceCategory
    })
    
    router.push(`/?${params.toString()}`)
  }, [router, searchQuery, location, radius, serviceCategory, reset, config])

  // Handle modal close (user declines)
  const handleModalClose = useCallback(() => {
    setShowConsentModal(false)
    reset()
    // Could redirect back to search or show alternative options
  }, [reset])

  // Don't render anything if we're not in the flow
  if (!showConsentModal && !showOffers) {
    return null
  }

  return (
    <>
      {/* Consent Modal */}
      <ShoutOutConsentModal
        isOpen={showConsentModal}
        onClose={handleModalClose}
        onConsent={handleConsent}
        searchQuery={searchQuery}
        location={location}
        serviceCategory={serviceCategory}
        isLoading={loading}
      />

      {/* Offers Display */}
      {showOffers && shoutOut && (
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Error</span>
              </div>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          <ShoutOutOffers
            shoutOutId={shoutOut.id}
            expiresAt={shoutOut.expires_at}
            onOfferAccept={handleOfferAccept}
            onExpandRadius={handleExpandRadius}
          />
        </div>
      )}
    </>
  )
}
