'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { MapConfig, ProviderMarker, MapBounds, MapEvent, MapAdapterInterface } from '@/types/maps'

// Import Mapbox CSS
import 'mapbox-gl/dist/mapbox-gl.css'

export default class MapboxMap implements MapAdapterInterface {
  private map: mapboxgl.Map | null = null
  private container: HTMLElement | null = null
  private config: MapConfig
  private markers: mapboxgl.Marker[] = []
  private eventListeners: Map<string, ((event: MapEvent) => void)[]> = new Map()

  constructor(config: MapConfig) {
    this.config = config
  }

  async mount(container: HTMLElement): Promise<void> {
    if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
      throw new Error('Mapbox access token not configured')
    }

    this.container = container

    // Initialize Mapbox
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

    this.map = new mapboxgl.Map({
      container,
      style: this.config.style || 'mapbox://styles/mapbox/streets-v11',
      center: this.config.center,
      zoom: this.config.zoom,
      attributionControl: true
    })

    // Wait for map to load
    await new Promise<void>((resolve, reject) => {
      if (!this.map) {
        reject(new Error('Map not initialized'))
        return
      }

      this.map.on('load', () => resolve())
      this.map.on('error', (error) => reject(error))
    })

    // Set up event listeners
    this.setupEventListeners()
  }

  updateMarkers(markers: ProviderMarker[]): void {
    if (!this.map) return

    // Clear existing markers
    this.clearMarkers()

    // Add new markers
    markers.forEach(markerData => {
      const marker = new mapboxgl.Marker({
        color: markerData.isAvailable ? '#10B981' : '#6B7280',
        scale: 0.8
      })
        .setLngLat(markerData.position)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(this.createMarkerPopup(markerData))
        )
        .addTo(this.map!)

      // Store marker reference
      this.markers.push(marker)

      // Add click event
      marker.getElement().addEventListener('click', () => {
        this.emit('click', {
          type: 'click',
          data: markerData
        })
      })
    })
  }

  teardown(): void {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
    this.clearMarkers()
    this.container = null
  }

  getBounds(): MapBounds | null {
    if (!this.map) return null

    const bounds = this.map.getBounds()
    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    }
  }

  fitBounds(bounds: MapBounds): void {
    if (!this.map) return

    const mapboxBounds = new mapboxgl.LngLatBounds(
      [bounds.west, bounds.south],
      [bounds.east, bounds.north]
    )
    this.map.fitBounds(mapboxBounds, { padding: 50 })
  }

  on(event: string, callback: (event: MapEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  off(event: string, callback: (event: MapEvent) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private setupEventListeners(): void {
    if (!this.map) return

    // Bounds change
    this.map.on('moveend', () => {
      const bounds = this.getBounds()
      if (bounds) {
        this.emit('bounds_change', {
          type: 'bounds_change',
          data: bounds
        })
      }
    })

    // Zoom change
    this.map.on('zoomend', () => {
      const bounds = this.getBounds()
      if (bounds) {
        this.emit('bounds_change', {
          type: 'bounds_change',
          data: bounds
        })
      }
    })
  }

  private clearMarkers(): void {
    this.markers.forEach(marker => marker.remove())
    this.markers = []
  }

  private createMarkerPopup(marker: ProviderMarker): string {
    return `
      <div class="p-2">
        <div class="font-semibold text-sm">${marker.title}</div>
        ${marker.specialty ? `<div class="text-xs text-gray-600">${marker.specialty}</div>` : ''}
        ${marker.price ? `<div class="text-sm font-medium text-green-600">$${(marker.price / 100).toFixed(2)}</div>` : ''}
        ${marker.rating ? `<div class="text-xs text-yellow-600">⭐ ${marker.rating.toFixed(1)}</div>` : ''}
        ${marker.description ? `<div class="text-xs text-gray-500 mt-1">${marker.description}</div>` : ''}
      </div>
    `
  }

  private emit(event: string, data: MapEvent): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }
}
