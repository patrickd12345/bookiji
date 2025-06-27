'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { AdvancedSearch, ReviewSystem } from '@/components'
import { Provider } from '@/types/providers'

export default function MarketplacePage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading] = useState(false)
  const [total, setTotal] = useState(0)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [showProviderModal, setShowProviderModal] = useState(false)

  const handleSearchResults = (results: { providers: Provider[], total: number }) => {
    setProviders(results.providers)
    setTotal(results.total)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const getLowestPrice = (services: Provider['services']) => {
    if (!services || services.length === 0) return null
    return Math.min(...services.map(s => s.price))
  }

  const StarRating = ({ rating, size = 'small' }: { rating: number, size?: 'small' | 'normal' }) => {
    const sizeClass = size === 'small' ? 'w-4 h-4' : 'w-5 h-5'
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`${sizeClass} ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
      </div>
    )
  }

  const ProviderCard = ({ provider }: { provider: Provider }) => {
    const lowestPrice = getLowestPrice(provider.services)
    const primaryLocation = provider.provider_locations?.find(loc => loc.is_primary) || provider.provider_locations?.[0]

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {provider.business_name || provider.name}
            </h3>
            {provider.business_name && (
              <p className="text-gray-600 text-sm mb-2">by {provider.name}</p>
            )}
            
            <div className="flex items-center gap-4 mb-3">
              <StarRating rating={provider.average_rating} />
              <span className="text-sm text-gray-600">
                ({provider.total_reviews} review{provider.total_reviews !== 1 ? 's' : ''})
              </span>
              {provider.distance && (
                <span className="text-sm text-gray-600">
                  {provider.distance.toFixed(1)} miles away
                </span>
              )}
            </div>

            {primaryLocation && (
              <p className="text-sm text-gray-600 mb-3 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {primaryLocation.address}
              </p>
            )}

            {provider.bio && (
              <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                {provider.bio}
              </p>
            )}
          </div>

          {lowestPrice && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Starting at</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatPrice(lowestPrice)}
              </p>
            </div>
          )}
        </div>

        {/* Services Preview */}
        {provider.services && provider.services.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Services:</p>
            <div className="flex flex-wrap gap-2">
              {provider.services.slice(0, 3).map((service) => (
                <span
                  key={service.id}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {service.name} - {formatPrice(service.price)}
                </span>
              ))}
              {provider.services.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  +{provider.services.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Link
            href={`/book/${provider.id}`}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
          >
            Book Now
          </Link>
          <button
            onClick={() => {
              setSelectedProvider(provider)
              setShowProviderModal(true)
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    )
  }

  const ProviderModal = () => {
    if (!selectedProvider) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedProvider.business_name || selectedProvider.name}
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  <StarRating rating={selectedProvider.average_rating} size="normal" />
                  <span className="text-gray-600">
                    ({selectedProvider.total_reviews} review{selectedProvider.total_reviews !== 1 ? 's' : ''})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowProviderModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Provider Info */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">About</h3>
              {selectedProvider.bio ? (
                <p className="text-gray-700">{selectedProvider.bio}</p>
              ) : (
                <p className="text-gray-500 italic">No description available</p>
              )}
            </div>

            {/* Services */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Services</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedProvider.services?.map((service) => (
                  <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{service.name}</h4>
                      <span className="text-lg font-bold text-blue-600">
                        {formatPrice(service.price)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Duration: {service.duration} minutes
                    </p>
                    {service.description && (
                      <p className="text-sm text-gray-700">{service.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Locations */}
            {selectedProvider.provider_locations && selectedProvider.provider_locations.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Locations</h3>
                <div className="space-y-3">
                  {selectedProvider.provider_locations.map((location) => (
                    <div key={location.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div>
                        <p className="font-medium">{location.name}</p>
                        <p className="text-sm text-gray-600">{location.address}</p>
                        {location.is_primary && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Primary Location
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="mb-6">
              <ReviewSystem
                vendorId={selectedProvider.id}
                showSubmissionForm={false}
              />
            </div>

            {/* Book Now Button */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -m-6 mt-6">
              <Link
                href={`/book/${selectedProvider.id}`}
                className="w-full block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
              >
                Book with {selectedProvider.business_name || selectedProvider.name}
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Find Service Providers
          </h1>
          <p className="text-xl text-gray-600">
            Discover verified professionals in your area with guaranteed bookings
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <AdvancedSearch
            onResults={handleSearchResults}
            showMap={false}
          />
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Searching for providers...</p>
          </div>
        ) : providers.length > 0 ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Search Results
              </h2>
              <p className="text-gray-600">
                {total} provider{total !== 1 ? 's' : ''} found
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>

            {/* Load More */}
            {providers.length < total && (
              <div className="text-center mt-8">
                <button
                  onClick={() => {
                    // Implement load more functionality
                    console.log('Load more providers')
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Load More Providers
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Start Your Search
            </h3>
            <p className="text-gray-600 mb-6">
              Use the search above to find service providers in your area
            </p>
            <Link
              href="/beta/signup"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Join as a Provider
            </Link>
          </div>
        )}
      </div>

      {/* Provider Modal */}
      {showProviderModal && <ProviderModal />}
    </div>
  )
} 