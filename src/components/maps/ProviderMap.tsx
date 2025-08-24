'use client'

import { useEffect, useState, useCallback } from 'react'
import MapAdapter from './MapAdapter'
import { MapProvider, MapConfig, ProviderMarker } from '@/types/maps'
import { useFeatureFlag } from '@/config/featureFlags'

interface ProviderMapProps {
  className?: string
  onProviderSelect?: (providerId: string) => void
  onBoundsChange?: (bounds: any) => void
}

/**
 * Provider Map Component
 * 
 * Integrates with the quote API to show real-time provider locations.
 * Uses MapAdapter for vendor-agnostic map rendering with fallback support.
 */
export default function ProviderMap({
  className = 'w-full h-96',
  onProviderSelect,
  onBoundsChange
}: ProviderMapProps) {
  const [markers, setMarkers] = useState<ProviderMarker[]>([])
  const [mapConfig, setMapConfig] = useState<MapConfig>({
    center: [45.5, -73.6], // Default to Montreal
    zoom: 12
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Feature flag check
  const mapAbstractionEnabled = useFeatureFlag('map_abstraction')

  // Determine map provider based on environment and feature flags
  const getMapProvider = (): MapProvider => {
    if (!mapAbstractionEnabled) {
      return 'leaflet' // Fallback to OpenStreetMap
    }

    // Check if Mapbox is available
    if (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
      return 'mapbox'
    }

    return 'leaflet'
  }

  // Convert quote candidates to map markers
  const convertCandidatesToMarkers = useCallback((candidates: any[]): ProviderMarker[] => {
    return candidates.map(candidate => ({
      id: candidate.provider_id,
      position: [candidate.location?.lat || 0, candidate.location?.lon || 0],
      title: candidate.provider_name || 'Provider',
      description: candidate.specialty || 'Service provider',
      price: candidate.price_cents,
      rating: candidate.rating,
      specialty: candidate.specialty,
      isAvailable: candidate.is_available !== false,
      data: candidate
    }))
  }, [])

  // Fetch providers from quote API
  const fetchProviders = useCallback(async (bounds?: any) => {
    if (!mapAbstractionEnabled) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          intent: 'haircut',
          location: {
            lat: bounds?.center?.[0] || mapConfig.center[0],
            lon: bounds?.center?.[1] || mapConfig.center[1]
          },
          radius: bounds?.radius || 5000 // 5km radius
        })
      })

      if (!response.ok) {
        throw new Error(`Quote API failed: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.ok && data.data?.candidates) {
        const newMarkers = convertCandidatesToMarkers(data.data.candidates)
        setMarkers(newMarkers)
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch providers')
    } finally {
      setIsLoading(false)
    }
  }, [mapAbstractionEnabled, mapConfig.center, convertCandidatesToMarkers])

  // Handle marker click
  const handleMarkerClick = useCallback((marker: ProviderMarker) => {
    onProviderSelect?.(marker.id)
  }, [onProviderSelect])

  // Handle bounds change
  const handleBoundsChange = useCallback((bounds: any) => {
    onBoundsChange?.(bounds)
    
    // Fetch new providers for the new area
    if (mapAbstractionEnabled) {
      fetchProviders(bounds)
    }
  }, [onBoundsChange, fetchProviders, mapAbstractionEnabled])

  // Initial fetch
  useEffect(() => {
    if (mapAbstractionEnabled) {
      fetchProviders()
    }
  }, [mapAbstractionEnabled, fetchProviders])

  // Update map config when center changes
  useEffect(() => {
    if (markers.length > 0) {
      // Calculate bounds to fit all markers
      const lats = markers.map(m => m.position[0])
      const lngs = markers.map(m => m.position[1])
      
      const center: [number, number] = [
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lngs) + Math.max(...lngs)) / 2
      ]
      
      setMapConfig(prev => ({
        ...prev,
        center
      }))
    }
  }, [markers])

  // Render fallback if map abstraction is disabled
  if (!mapAbstractionEnabled) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-2xl mb-2">🗺️</div>
          <div className="text-sm text-gray-600">Map view disabled</div>
          <div className="text-xs text-gray-500">Enable map_abstraction feature flag</div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <MapAdapter
        provider={getMapProvider()}
        config={mapConfig}
        markers={markers}
        onMarkerClick={handleMarkerClick}
        onBoundsChange={handleBoundsChange}
        fallbackToOpenStreetMap={true}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div className="text-sm text-gray-600">Loading providers...</div>
          </div>
        </div>
      )}
      
      {/* Error overlay */}
      {error && (
        <div className="absolute bottom-4 left-4 bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}
      
      {/* Provider count */}
      {markers.length > 0 && (
        <div className="absolute top-4 left-4 bg-white bg-opacity-90 px-2 py-1 rounded text-xs">
          {markers.length} provider{markers.length !== 1 ? 's' : ''} found
        </div>
      )}
    </div>
  )
}
