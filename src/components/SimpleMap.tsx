/// <reference types="@types/google.maps" />

'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// Add Google Maps types
declare global {
  interface Window {
    google: typeof google
  }
}

interface MapProps {
  center?: google.maps.LatLngLiteral
  zoom?: number
  markers?: Array<{
    position: google.maps.LatLngLiteral
    title?: string
  }>
  onMapClick?: (e: google.maps.MapMouseEvent) => void
  onMarkerClick?: (marker: google.maps.Marker) => void
  className?: string
}

export default function SimpleMap({
  center = { lat: 51.505, lng: -0.09 },
  zoom = 13,
  markers = [],
  onMapClick,
  onMarkerClick,
  className
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [mapMarkers, setMapMarkers] = useState<google.maps.Marker[]>([])

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: false
    })

    if (onMapClick) {
      mapInstance.addListener('click', onMapClick)
    }

    setMap(mapInstance)

    return () => {
      if (onMapClick) {
        window.google.maps.event.clearListeners(mapInstance, 'click')
      }
    }
  }, [mapRef, center, zoom, onMapClick])

  // Update markers
  useEffect(() => {
    // Clear existing markers
    mapMarkers.forEach(marker => marker.setMap(null))

    if (!map) return

    const newMarkers: google.maps.Marker[] = []

    // Add new markers
    markers.forEach(markerData => {
      const marker = new window.google.maps.Marker({
        position: markerData.position,
        map,
        title: markerData.title
      })

      if (onMarkerClick) {
        marker.addListener('click', () => onMarkerClick(marker))
      }

      newMarkers.push(marker)
    })

    setMapMarkers(newMarkers)

    return () => {
      newMarkers.forEach(marker => marker.setMap(null))
    }
  }, [map, markers, onMarkerClick, mapMarkers])

  return (
    <div ref={mapRef} className={cn('w-full h-[400px] rounded-lg', className)} />
  )
} 