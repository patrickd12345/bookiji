'use client';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type * as GeoJSON from 'geojson';

function createCircle(lng: number, lat: number, radiusMeters = 200) {
  const points = 32;
  const coords: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const dx = (radiusMeters / 111320) * Math.cos(angle);
    const dy = (radiusMeters / 110540) * Math.sin(angle);
    coords.push([lng + dx, lat + dy]);
  }
  coords.push(coords[0]);
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  } as GeoJSON.Feature<GeoJSON.Polygon>;
}

interface Provider {
  id: string;
  latitude: number;
  longitude: number;
  category?: string;
  rating?: number;
}

export default function ProviderMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filters, setFilters] = useState({ category: '', minRating: 0 });
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams();
        if (filters.category) params.set('category', filters.category);
        if (filters.minRating) params.set('min_rating', String(filters.minRating));
        const res = await fetch(`/api/search/providers?${params.toString()}`);
        const data = await res.json().catch(() => ({ providers: [] as Provider[] }));
        const jittered = (data.providers || []).map((p: Provider) => {
          const offset = () => (Math.random() * 0.0015 + 0.0015) * (Math.random() < 0.5 ? -1 : 1);
          return {
            id: p.id,
            latitude: p.latitude + offset(),
            longitude: p.longitude + offset(),
            category: p.category,
            rating: p.rating,
          };
        });
        setProviders(jittered);
      } catch {
        setProviders([]);
      }
    }
    load();
  }, [filters]);

  useEffect(() => {
    if (typeof window === 'undefined' || !token || !mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-73.935242, 40.73061],
      zoom: 9,
    });

    const features = providers.map(p => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
      properties: {},
    }));

    if (providers.length > 50) {
      map.addSource('providers', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'providers',
        filter: ['has', 'point_count'],
        paint: { 'circle-color': '#51bbd6', 'circle-radius': 20 },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'providers',
        filter: ['has', 'point_count'],
        layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12 },
      });
      map.addLayer({
        id: 'unclustered',
        type: 'circle',
        source: 'providers',
        filter: ['!', ['has', 'point_count']],
        paint: { 'circle-color': '#11b4da', 'circle-radius': 8 },
      });
    } else {
      features.forEach(f => {
        new mapboxgl.Marker().setLngLat(f.geometry.coordinates as [number, number]).addTo(map);
      });
      const circles = providers.map(p => createCircle(p.longitude, p.latitude));
      map.addSource('privacy-radius', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: circles },
      });
      map.addLayer({
        id: 'privacy-fill',
        type: 'fill',
        source: 'privacy-radius',
        paint: { 'fill-color': 'rgba(0,0,255,0.1)' },
      });
      map.addLayer({
        id: 'privacy-line',
        type: 'line',
        source: 'privacy-radius',
        paint: { 'line-color': 'rgba(0,0,255,0.3)', 'line-width': 1 },
      });
    }

    return () => map.remove();
  }, [token, providers]);

  if (!token) {
    return <div data-testid="no-map">Map unavailable</div>;
  }

  return (
    <div className="w-full">
      <div className="mb-2 flex gap-2">
        <select
          data-testid="category-filter"
          value={filters.category}
          onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
        >
          <option value="">All</option>
          <option value="hair">Hair</option>
          <option value="massage">Massage</option>
        </select>
        <select
          data-testid="rating-filter"
          value={String(filters.minRating)}
          onChange={e => setFilters(f => ({ ...f, minRating: Number(e.target.value) }))}
        >
          <option value="0">Any rating</option>
          <option value="4">4+</option>
          <option value="5">5</option>
        </select>
      </div>
      <div ref={mapRef} className="h-[400px] w-full" data-testid="provider-map">
        {providers.map(p => (
          <div key={p.id} data-testid="marker" data-category={p.category} data-rating={p.rating}></div>
        ))}
      </div>
    </div>
  );
}
