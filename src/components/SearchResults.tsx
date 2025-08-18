'use client'

import React, { useState, useEffect } from 'react'
import { Star, MapPin, Clock, DollarSign } from 'lucide-react'
import ShoutOutFlow from './ShoutOutFlow'

interface Provider {
  id: string
  name: string
  business_name?: string
  average_rating: number
  total_reviews: number
  distance?: number
  services: {
    id: string
    name: string
    category: string
    price: number
    duration: number
  }[]
  provider_locations: {
    id: string
    name: string
    address: string
    latitude: number
    longitude: number
    is_primary: boolean
  }[]
}

interface SearchResultsProps {
  providers: Provider[]
  total: number
  searchQuery: string
  location: string
  latitude?: number
  longitude?: number
  serviceCategory: string
  radius: number
  loading?: boolean
}

export default function SearchResults({
  providers,
  total,
  searchQuery,
  location,
  latitude,
  longitude,
  serviceCategory,
  radius,
  loading = false
}: SearchResultsProps) {
  const [showShoutOutFlow, setShowShoutOutFlow] = useState(false)

  // Show shout-out flow when there are no results
  useEffect(() => {
    if (!loading && total === 0 && searchQuery && location && latitude && longitude) {
      setShowShoutOutFlow(true)
    } else {
      setShowShoutOutFlow(false)
    }
  }, [loading, total, searchQuery, location, latitude, longitude])

  // Format price
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show shout-out flow for zero results
  if (showShoutOutFlow) {
    return (
      <ShoutOutFlow
        searchQuery={searchQuery}
        location={location}
        latitude={latitude!}
        longitude={longitude!}
        serviceCategory={serviceCategory}
        radius={radius}
      />
    )
  }

  if (total === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="space-y-4">
          <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <MapPin className="h-6 w-6 text-gray-400" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No providers found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search criteria or expanding your search radius.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Results header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {total} {total === 1 ? 'provider' : 'providers'} found
        </h2>
        <p className="text-sm text-gray-600">
          Showing results for "{searchQuery}" in {location}
        </p>
      </div>

      {/* Provider cards */}
      <div className="grid gap-4">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {provider.business_name || provider.name}
                </h3>
                <div className="flex items-center gap-3 mb-2">
                  {renderStars(provider.average_rating)}
                  <span className="text-sm text-gray-500">
                    ({provider.total_reviews} reviews)
                  </span>
                  {provider.distance && (
                    <>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                        <span>{provider.distance.toFixed(1)} km away</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Services:</h4>
              <div className="grid gap-3">
                {provider.services.map((service) => (
                  <div
                    key={service.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{service.name}</h5>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        <span>{service.duration} minutes</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-lg font-semibold text-green-600">
                        <DollarSign className="h-4 w-4" aria-hidden="true" />
                        <span>{formatPrice(service.price * 100)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Location */}
            {provider.provider_locations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">Location:</h4>
                <div className="text-sm text-gray-600">
                  {provider.provider_locations.find(loc => loc.is_primary)?.address ||
                   provider.provider_locations[0]?.address}
                </div>
              </div>
            )}

            {/* Action button */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                View Details & Book
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
