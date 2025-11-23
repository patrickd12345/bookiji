'use client'

import { useEffect, useRef, useState } from 'react'
import { MapProvider, MapConfig, ProviderMarker, MapBounds, MapAdapterInterface } from '@/types/maps'

export interface MapAdapterProps {
  provider: MapProvider
  config: MapConfig
  markers: ProviderMarker[]
  onMarkerClick?: (marker: ProviderMarker) => void
  onBoundsChange?: (bounds: MapBounds) => void
  fallbackToOpenStreetMap?: boolean
}

/**
 * Universal Map Adapter Component
 * 
 * Dynamically loads either Mapbox or Leaflet based on availability and configuration.
 * Provides robust fallback handling and a unified interface for map interactions.
 */
export default function MapAdapter({
  provider: initialProvider,
  config,
  markers,
  onMarkerClick,
  onBoundsChange,
  fallbackToOpenStreetMap = true
}: MapAdapterProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const adapterRef = useRef<MapAdapterInterface | null>(null)
  const [activeProvider, setActiveProvider] = useState<MapProvider>(initialProvider)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Update active provider if prop changes (unless we're in fallback mode)
  useEffect(() => {
    if (initialProvider !== activeProvider && !error) {
      setActiveProvider(initialProvider)
    }
  }, [initialProvider, activeProvider, error])

  // Initialize Map
  useEffect(() => {
    let mounted = true
    setIsLoading(true)
    setError(null)

    async function initMap() {
      if (!containerRef.current) return

      // Teardown existing map instance
      if (adapterRef.current) {
        adapterRef.current.teardown()
        adapterRef.current = null
      }

      try {
        let AdapterClass

        if (activeProvider === 'mapbox') {
          try {
            const mapModule = await import('./MapboxMap')
            AdapterClass = mapModule.default
          } catch {
            throw new Error('Failed to load Mapbox adapter')
          }
        } else {
          try {
            const mapModule = await import('./LeafletMap')
            AdapterClass = mapModule.default
          } catch {
            throw new Error('Failed to load Leaflet adapter')
          }
        }

        if (!mounted) return

        const adapter = new AdapterClass(config)
        await adapter.mount(containerRef.current)
        
        if (!mounted) {
          adapter.teardown()
          return
        }

        adapterRef.current = adapter

        // Initial markers
        adapter.updateMarkers(markers)

        // Event listeners
        adapter.on('click', (e) => {
          if (onMarkerClick && e.type === 'click') {
            onMarkerClick(e.data)
          }
        })

        adapter.on('bounds_change', (e) => {
          if (onBoundsChange && e.type === 'bounds_change') {
            onBoundsChange(e.data)
          }
        })

        setIsLoading(false)

      } catch (err) {
        console.error(`Failed to initialize ${activeProvider} map:`, err)
        
        if (!mounted) return

        if (activeProvider === 'mapbox' && fallbackToOpenStreetMap) {
          console.log('Falling back to Leaflet/OpenStreetMap...')
          setActiveProvider('leaflet')
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load map')
          setIsLoading(false)
        }
      }
    }

    initMap()

    return () => {
      mounted = false
      if (adapterRef.current) {
        adapterRef.current.teardown()
        adapterRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProvider])

  // Update view when config changes
  useEffect(() => {
    if (adapterRef.current) {
      adapterRef.current.setCenter(config.center)
      adapterRef.current.setZoom(config.zoom)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.center[0], config.center[1], config.zoom])

  // Update markers when prop changes
  useEffect(() => {
    if (adapterRef.current) {
      adapterRef.current.updateMarkers(markers)
    }
  }, [markers])

  return (
    <div className="relative w-full h-full min-h-[400px] bg-gray-100 rounded-lg overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-gray-600">Loading map ({activeProvider})...</div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center p-4">
            <div className="text-red-500 text-xl mb-2">⚠️</div>
            <div className="text-gray-800 font-medium mb-1">Map Unavailable</div>
            <div className="text-gray-600 text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* Attribution / Provider Indicator */}
      <div className="absolute bottom-1 left-1 z-[1000] bg-white bg-opacity-70 px-1.5 py-0.5 rounded text-[10px] text-gray-500 pointer-events-none">
        {activeProvider === 'mapbox' ? 'Mapbox' : 'Leaflet'}
      </div>
    </div>
  )
}
