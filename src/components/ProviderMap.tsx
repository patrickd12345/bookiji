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
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filters, setFilters] = useState({ category: '', minRating: 0 });
  const [isMapLoaded, setIsMapLoaded] = useState(false);
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
    if (mapInstanceRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-73.935242, 40.73061],
      zoom: 9,
    });

    map.on('load', () => {
      // Initialize sources
      map.addSource('providers', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
        clusterMinPoints: 3,
      });

      map.addSource('privacy-radius', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Add cluster layers
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'providers',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6', 3,
            '#f1f075', 10,
            '#f28cb1', 30
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20, 3,
            30, 10,
            40, 30
          ]
        },
      });

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'providers',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
          'text-font': ['Open Sans Semibold']
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Add unclustered point layer
      map.addLayer({
        id: 'unclustered',
        type: 'circle',
        source: 'providers',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#11b4da',
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        },
      });

      // Add privacy radius layers
      map.addLayer({
        id: 'privacy-fill',
        type: 'fill',
        source: 'privacy-radius',
        paint: {
          'fill-color': 'rgba(0,0,255,0.05)',
          'fill-opacity': 0.3
        },
      });

      map.addLayer({
        id: 'privacy-line',
        type: 'line',
        source: 'privacy-radius',
        paint: {
          'line-color': 'rgba(0,0,255,0.4)',
          'line-width': 1,
          'line-dasharray': [2, 2]
        },
      });

      setIsMapLoaded(true);
    });

    // Add click handlers
    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (features.length > 0) {
        const clusterId = features[0].properties?.cluster_id;
        const source = map.getSource('providers') as mapboxgl.GeoJSONSource;
        if (source && clusterId) {
          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            const geometry = features[0].geometry as { coordinates?: [number, number] };
            if (geometry.coordinates) {
              map.easeTo({
                center: geometry.coordinates as [number, number],
                zoom: zoom || 14
              });
            }
          });
        }
      }
    });

    // Add click handlers for individual providers
    map.on('click', 'unclustered', (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const geometry = feature.geometry as { coordinates?: [number, number] };
        const providerId = feature.properties?.id;
        
        if (geometry.coordinates) {
          // Show provider details popup
          new mapboxgl.Popup()
            .setLngLat(geometry.coordinates as [number, number])
            .setHTML(`<h3>Provider ${providerId}</h3><p>Click to view details</p>`)
            .addTo(map);
        }
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoaded) return;

    const features = providers.map(p => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
      properties: { id: p.id, category: p.category, rating: p.rating },
    }));

    const circles = providers.map(p => createCircle(p.longitude, p.latitude, 250));

    const providerSource = map.getSource('providers') as mapboxgl.GeoJSONSource;
    const privacySource = map.getSource('privacy-radius') as mapboxgl.GeoJSONSource;

    if (providerSource) {
      providerSource.setData({ type: 'FeatureCollection', features });
    }

    if (privacySource) {
      privacySource.setData({ type: 'FeatureCollection', features: circles });
    }
  }, [providers, isMapLoaded]);

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
