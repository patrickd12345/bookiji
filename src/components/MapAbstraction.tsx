'use client';
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { calculateRadiusZone } from '@/utils/helpers';

const CENTER: [number, number] = [45.5017, -73.5673]; // Montreal

// Marker type
interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

function SetView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

function randomizeWithinRadius(lat: number, lng: number, radiusKm: number) {
  // Random angle and distance
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusKm;
  // Approximate conversion: 1 degree lat ~ 111km, 1 degree lng ~ 111km * cos(lat)
  const deltaLat = (distance / 111) * Math.cos(angle);
  const deltaLng = (distance / (111 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
  return [lat + deltaLat, lng + deltaLng];
}

export default function MapAbstraction({ markers = [], showExact = false }: { markers?: MarkerData[], showExact?: boolean }) {
  // For density, treat all markers as providers
  return (
    <div className="w-full h-[600px] rounded-xl overflow-hidden shadow">
      <MapContainer center={CENTER} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <SetView center={CENTER} />
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Render privacy circles and fuzzed markers */}
        {markers.map((marker, idx) => {
          // Calculate density-based radius (in km)
          const providers = markers.map(m => ({
            id: m.id,
            name: m.label,
            services: [],
            category: 'wellness' as const,
            rating: 0,
            price: '',
            location: { lat: m.lat, lng: m.lng },
            availability: [],
            isActive: true
          }));
          const radiusZone = calculateRadiusZone(providers, marker.lat, marker.lng);
          const radiusMeters = radiusZone.radius * 1000;
          // Fuzzed marker position
          const [fuzzLat, fuzzLng] = randomizeWithinRadius(marker.lat, marker.lng, radiusZone.radius);
          return (
            <React.Fragment key={marker.id}>
              {/* Privacy circle */}
              <Circle
                center={[marker.lat, marker.lng]}
                radius={radiusMeters}
                pathOptions={{ fillColor: 'blue', fillOpacity: 0.15, color: 'blue', weight: 1, dashArray: '4 4' }}
              />
              {/* Fuzzed marker (not exact) */}
              {!showExact && (
                <Marker position={[fuzzLat, fuzzLng]}>
                  <Popup>{marker.label}<br/>(Approximate area)</Popup>
                </Marker>
              )}
              {/* Optionally, show exact marker for admin/debug */}
              {showExact && (
                <Marker position={[marker.lat, marker.lng]}>
                  <Popup>{marker.label}<br/>(Exact location)</Popup>
                </Marker>
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
} 
