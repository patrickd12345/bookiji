'use client';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

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
        const data = await res.json().catch(() => ({ providers: [] }));
        const jittered = (data.providers || []).map((p: any) => ({
          id: p.id,
          latitude: p.latitude + (Math.random() - 0.5) * 0.01,
          longitude: p.longitude + (Math.random() - 0.5) * 0.01,
          category: p.category,
          rating: p.rating,
        }));
        setProviders(jittered);
      } catch {
        setProviders([]);
      }
    }
    load();
  }, [filters]);

  useEffect(() => {
    if (!token || !mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-73.935242, 40.73061],
      zoom: 9,
    });
    providers.forEach(p => {
      new mapboxgl.Marker().setLngLat([p.longitude, p.latitude]).addTo(map);
    });
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
