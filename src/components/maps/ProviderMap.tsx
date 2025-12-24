'use client'

import { useEffect, useState, useCallback } from 'react'
import MapAdapter from './MapAdapter'
import { MapProvider, MapConfig, ProviderMarker } from '@/types/maps'
import { useFeatureFlag } from '@/config/featureFlags'

interface ProviderMapProps {
  className?: string
  onProviderSelect?: (providerId: string) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // Note: We need to fetch provider locations separately since quote API doesn't return lat/lng
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convertCandidatesToMarkers = useCallback(async (candidates: any[], centerLat: number, centerLng: number): Promise<ProviderMarker[]> => {
    // For now, use center location with jitter for visualization
    // In production, you'd fetch actual provider_locations from Supabase
    return candidates.map((candidate, _index) => {
      // Add small random offset for visualization (in production, use real location)
      const jitter = 0.01 * (Math.random() - 0.5)
      return {
        id: candidate.id,
        position: [centerLat + jitter, centerLng + jitter] as [number, number],
        title: candidate.name || 'Provider',
        description: `Distance: ${candidate.distance_km?.toFixed(1)}km`,
        price: candidate.estimated_price_cents,
        rating: candidate.rating,
        specialty: undefined,
        isAvailable: candidate.availability_score > 0.5,
        data: candidate
      }
    })
  }, [])

  // Fetch providers from quote API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchProviders = useCallback(async (bounds?: any) => {
    if (!mapAbstractionEnabled) return

    try {
      setIsLoading(true)
      setError(null)

      const centerLat = bounds?.center?.[0] || mapConfig.center[0]
      const centerLng = bounds?.center?.[1] || mapConfig.center[1]
      const radiusKm = (bounds?.radius || 5000) / 1000 // Convert meters to km

      // Format date_time for 1 hour from now
      const dateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service_type: 'haircut',
          location: {
            latitude: centerLat,
            longitude: centerLng,
            radius_km: radiusKm
          },
          date_time: dateTime,
          duration_minutes: 60
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Quote API failed: ${response.status}`)
      }

      const data = await response.json()
      
      // API returns { quote_id, candidates, ... }
      if (data.candidates && Array.isArray(data.candidates)) {
        const newMarkers = await convertCandidatesToMarkers(data.candidates, centerLat, centerLng)
        setMarkers(newMarkers)
      } else {
        setMarkers([])
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch providers')
      setMarkers([]) // Clear markers on error
    } finally {
      setIsLoading(false)
    }
  }, [mapAbstractionEnabled, mapConfig.center, convertCandidatesToMarkers])

  // Handle marker click
  const handleMarkerClick = useCallback((marker: ProviderMarker) => {
    onProviderSelect?.(marker.id)
  }, [onProviderSelect])

  // Handle bounds change
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        <div className="absolute bottom-4 left-4 bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-sm max-w-md z-50">
          <div className="font-medium mb-1">⚠️ Failed to fetch</div>
          <div className="text-xs mb-2">{error}</div>
          <button
            onClick={() => {
              setError(null)
              fetchProviders()
            }}
            className="text-xs underline hover:no-underline font-medium"
          >
            Try again
          </button>
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
