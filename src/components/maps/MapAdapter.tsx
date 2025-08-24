'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { MapProvider, MapConfig, ProviderMarker, MapBounds } from '@/types/maps'

// Dynamic imports to avoid SSR issues
const MapboxMap = dynamic(() => import('./MapboxMap'), { ssr: false })
const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false })

export interface MapAdapterProps {
  provider: MapProvider
  config: MapConfig
  markers: ProviderMarker[]
  onMarkerClick?: (marker: ProviderMarker) => void
  onBoundsChange?: (bounds: MapBounds) => void
  fallbackToOpenStreetMap?: boolean
}

export interface MapAdapterRef {
  mount: (container: HTMLElement) => void
  updateMarkers: (markers: ProviderMarker[]) => void
  teardown: () => void
  getBounds: () => MapBounds | null
  fitBounds: (bounds: MapBounds) => void
}

/**
 * Map Adapter Interface
 * 
 * Provides a unified interface for different map providers with automatic fallback.
 * Handles provider switching, marker management, and graceful degradation.
 */
export default function MapAdapter({
  provider,
  config,
  markers,
  onMarkerClick,
  onBoundsChange,
  fallbackToOpenStreetMap = true
}: MapAdapterProps) {
  const [currentProvider, setCurrentProvider] = useState<MapProvider>(provider)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapAdapterRef | null>(null)

  // Handle provider fallback
  const handleProviderError = useCallback((failedProvider: MapProvider, error: Error) => {
    console.warn(`Map provider ${failedProvider} failed:`, error)
    
    if (failedProvider === 'mapbox' && fallbackToOpenStreetMap) {
      setCurrentProvider('leaflet')
      setError(`Falling back to OpenStreetMap: ${error.message}`)
    } else {
      setError(`Map failed to load: ${error.message}`)
    }
  }, [fallbackToOpenStreetMap])

  // Mount map to container
  const mountMap = useCallback(async (container: HTMLElement) => {
    try {
      setIsLoading(true)
      setError(null)

      if (currentProvider === 'mapbox') {
        const MapboxComponent = await import('./MapboxMap')
        const map = new MapboxComponent.default(container, config)
        await map.mount()
        setMapInstance(map)
        mapRef.current = map
      } else {
        const LeafletComponent = await import('./LeafletMap')
        const map = new LeafletComponent.default(container, config)
        await map.mount()
        setMapInstance(map)
        mapRef.current = map
      }

      setIsLoading(false)
    } catch (error) {
      handleProviderError(currentProvider, error as Error)
    }
  }, [currentProvider, config, handleProviderError])

  // Update markers on the map
  const updateMapMarkers = useCallback((newMarkers: ProviderMarker[]) => {
    if (mapRef.current) {
      mapRef.current.updateMarkers(newMarkers)
    }
  }, [])

  // Teardown map instance
  const teardownMap = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.teardown()
      setMapInstance(null)
      mapRef.current = null
    }
  }, [])

  // Handle bounds change
  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    onBoundsChange?.(bounds)
  }, [onBoundsChange])

  // Handle marker click
  const handleMarkerClick = useCallback((marker: ProviderMarker) => {
    onMarkerClick?.(marker)
  }, [onMarkerClick])

  // Mount map when container is ready
  useEffect(() => {
    if (containerRef.current && !mapInstance) {
      mountMap(containerRef.current)
    }
  }, [containerRef.current, mountMap, mapInstance])

  // Update markers when they change
  useEffect(() => {
    if (mapInstance && markers.length > 0) {
      updateMapMarkers(markers)
    }
  }, [markers, mapInstance, updateMapMarkers])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      teardownMap()
    }
  }, [teardownMap])

  // Handle provider change
  useEffect(() => {
    if (currentProvider !== provider) {
      teardownMap()
      setCurrentProvider(provider)
    }
  }, [provider, currentProvider, teardownMap])

  // Render fallback content
  if (error && currentProvider === 'leaflet') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-2xl mb-2">🗺️</div>
          <div className="text-sm text-gray-600">Using OpenStreetMap (fallback)</div>
          <div className="text-xs text-gray-500 mt-1">{error}</div>
        </div>
      </div>
    )
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">Loading map...</div>
        </div>
      </div>
    )
  }

  // Render map container
  return (
    <div className="w-full h-full relative">
      <div 
        ref={containerRef}
        className="w-full h-full"
        data-map-provider={currentProvider}
      />
      
      {/* Provider indicator */}
      <div className="absolute top-2 right-2 bg-white bg-opacity-90 px-2 py-1 rounded text-xs">
        {currentProvider === 'mapbox' ? 'Mapbox' : 'OpenStreetMap'}
      </div>
      
      {/* Error display */}
      {error && (
        <div className="absolute bottom-2 left-2 bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  )
}

// Export the adapter interface for external use
export { MapAdapter }
export type { MapAdapterRef }
