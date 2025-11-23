'use client'

import L from 'leaflet'
import { MapConfig, ProviderMarker, MapBounds, MapEvent, MapAdapterInterface } from '@/types/maps'

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css'

// Fix Leaflet marker icons
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export default class LeafletMap implements MapAdapterInterface {
  private map: L.Map | null = null
  private container: HTMLElement | null = null
  private config: MapConfig
  private markers: L.Marker[] = []
  private eventListeners: Map<string, ((event: MapEvent) => void)[]> = new Map()

  constructor(config: MapConfig) {
    this.config = config
  }

  async mount(container: HTMLElement): Promise<void> {
    this.container = container

    // Initialize Leaflet with OpenStreetMap tiles
    this.map = L.map(container, {
      center: this.config.center,
      zoom: this.config.zoom,
      zoomControl: true,
      attributionControl: true
    })

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      tileSize: 256,
      zoomOffset: 0
    }).addTo(this.map)

    // Wait for map to load
    await new Promise<void>((resolve) => {
      if (!this.map) {
        resolve()
        return
      }

      this.map.on('load', () => resolve())
      // Leaflet doesn't have a load event, so resolve immediately
      resolve()
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
      const marker = L.marker(markerData.position, {
        icon: L.divIcon({
          className: 'custom-marker',
          html: this.createMarkerHTML(markerData),
          iconSize: [30, 30],
          iconAnchor: [15, 30]
        })
      })

      // Add popup
      marker.bindPopup(this.createMarkerPopup(markerData))

      // Add to map
      marker.addTo(this.map!)

      // Store marker reference
      this.markers.push(marker)

      // Add click event
      marker.on('click', () => {
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

    const leafletBounds = L.latLngBounds(
      [bounds.south, bounds.west],
      [bounds.north, bounds.east]
    )
    this.map.fitBounds(leafletBounds, { padding: [50, 50] })
  }

  setCenter(center: [number, number]): void {
    if (!this.map) return
    this.map.setView(center, this.map.getZoom())
  }

  setZoom(zoom: number): void {
    if (!this.map) return
    this.map.setZoom(zoom)
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

  private createMarkerHTML(marker: ProviderMarker): string {
    const color = marker.isAvailable ? '#10B981' : '#6B7280'
    return `
      <div style="
        width: 30px;
        height: 30px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
      ">
        ${marker.title.charAt(0).toUpperCase()}
      </div>
    `
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
