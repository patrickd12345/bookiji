export type MapProvider = 'mapbox' | 'leaflet' | 'openstreetmap'

export interface MapConfig {
  center: [number, number] // [lat, lng]
  zoom: number
  style?: string
  accessToken?: string
  tileUrl?: string
  attribution?: string
}

export interface ProviderMarker {
  id: string
  position: [number, number] // [lat, lng]
  title: string
  description?: string
  price?: number
  rating?: number
  specialty?: string
  isAvailable?: boolean
  data?: Record<string, unknown>
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface MapEvent {
  type: 'click' | 'drag' | 'zoom' | 'bounds_change'
  data: unknown
}

export interface MapAdapterInterface {
  mount: (container: HTMLElement) => Promise<void>
  updateMarkers: (markers: ProviderMarker[]) => void
  teardown: () => void
  getBounds: () => MapBounds | null
  fitBounds: (bounds: MapBounds) => void
  setCenter: (center: [number, number]) => void
  setZoom: (zoom: number) => void
  on: (event: string, callback: (event: MapEvent) => void) => void
  off: (event: string, callback: (event: MapEvent) => void) => void
}
