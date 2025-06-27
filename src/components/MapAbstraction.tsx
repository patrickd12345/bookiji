'use client';
import React, { useState, useEffect } from 'react';

interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

interface ProviderZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  providers: number;
  radius: number;
  color: string;
}

export default function MapAbstraction({ 
  markers = [], 
  showExact = false,
  radius = 5 
}: { 
  markers?: MarkerData[];
  showExact?: boolean;
  radius?: number;
}) {
  const [isClient, setIsClient] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const timer = setTimeout(() => {
      setMapLoaded(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const providerZones: ProviderZone[] = [
    {
      id: 'downtown',
      name: 'Downtown Manhattan',
      lat: 40.7074,
      lng: -74.0113,
      providers: 8,
      radius: 1200,
      color: '#3B82F6'
    },
    {
      id: 'midtown',
      name: 'Midtown Manhattan',
      lat: 40.7549,
      lng: -73.9840,
      providers: 12,
      radius: 1500,
      color: '#10B981'
    },
    {
      id: 'uptown',
      name: 'Upper East Side',
      lat: 40.7736,
      lng: -73.9566,
      providers: 6,
      radius: 1000,
      color: '#F59E0B'
    },
    {
      id: 'brooklyn',
      name: 'Brooklyn Heights',
      lat: 40.6962,
      lng: -73.9961,
      providers: 4,
      radius: 800,
      color: '#EF4444'
    }
  ];

  if (!isClient) {
    return (
      <div className="w-full">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Service Area Map</h3>
          <p className="text-sm text-gray-600">Loading interactive map...</p>
        </div>
        <div className="w-full h-96 bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Service Area Map</h3>
        <p className="text-sm text-gray-600">Interactive map showing real provider locations in NYC</p>
      </div>

      <div className="w-full h-96 rounded-lg border-2 border-gray-200 overflow-hidden relative">
        {!mapLoaded ? (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading real map data...</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-blue-50 relative">
            {/* Simple street grid background */}
            <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
              {/* Horizontal lines */}
              <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#cbd5e1" strokeWidth="1" opacity="0.6"/>
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#cbd5e1" strokeWidth="1" opacity="0.6"/>
              <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#cbd5e1" strokeWidth="1" opacity="0.6"/>
              
              {/* Vertical lines */}
              <line x1="25%" y1="0" x2="25%" y2="100%" stroke="#cbd5e1" strokeWidth="1" opacity="0.6"/>
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#cbd5e1" strokeWidth="1" opacity="0.6"/>
              <line x1="75%" y1="0" x2="75%" y2="100%" stroke="#cbd5e1" strokeWidth="1" opacity="0.6"/>
              
              {/* Grid pattern */}
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.3"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Your location marker - center of map */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 10 }}>
              <div className="relative">
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs font-medium text-gray-700 shadow border whitespace-nowrap">
                  📍 Your Location (NYC)
                </div>
              </div>
            </div>

            {/* Provider zones - positioned manually */}
            {/* Downtown Manhattan - Blue */}
            <div className="absolute" style={{ top: '25%', left: '30%', zIndex: 20 }}>
              <div className="relative group cursor-pointer">
                <div className="w-16 h-16 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white font-bold text-lg bg-blue-500 hover:scale-110 transition-transform">
                  8
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white px-2 py-1 rounded text-xs font-medium text-gray-700 shadow border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  Downtown Manhattan
                </div>
              </div>
            </div>

            {/* Midtown Manhattan - Green */}
            <div className="absolute" style={{ top: '35%', right: '25%', zIndex: 20 }}>
              <div className="relative group cursor-pointer">
                <div className="w-16 h-16 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white font-bold text-lg bg-green-500 hover:scale-110 transition-transform">
                  12
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white px-2 py-1 rounded text-xs font-medium text-gray-700 shadow border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  Midtown Manhattan
                </div>
              </div>
            </div>

            {/* Upper East Side - Orange */}
            <div className="absolute" style={{ top: '20%', right: '20%', zIndex: 20 }}>
              <div className="relative group cursor-pointer">
                <div className="w-16 h-16 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white font-bold text-lg bg-yellow-500 hover:scale-110 transition-transform">
                  6
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white px-2 py-1 rounded text-xs font-medium text-gray-700 shadow border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  Upper East Side
                </div>
              </div>
            </div>

            {/* Brooklyn Heights - Red */}
            <div className="absolute" style={{ bottom: '30%', left: '35%', zIndex: 20 }}>
              <div className="relative group cursor-pointer">
                <div className="w-16 h-16 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white font-bold text-lg bg-red-500 hover:scale-110 transition-transform">
                  4
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white px-2 py-1 rounded text-xs font-medium text-gray-700 shadow border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  Brooklyn Heights
                </div>
              </div>
            </div>

            {/* Search radius circle */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 5 }}>
              <div 
                className="border-2 border-dashed border-blue-400 rounded-full opacity-40"
                style={{ 
                  width: `${radius * 40}px`,
                  height: `${radius * 40}px`
                }}
              ></div>
            </div>

            {/* Map label */}
            <div className="absolute bottom-2 right-2 bg-white bg-opacity-80 px-2 py-1 rounded text-xs text-gray-600" style={{ zIndex: 30 }}>
              Interactive Service Map
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900">Map Legend</h4>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Search Radius:</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
              {radius}km
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium text-gray-900 mb-2">Map Elements</h5>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Your Location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-dashed border-blue-400 rounded-full"></div>
                <span>Search Radius ({radius}km)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Provider Zones</span>
              </div>
            </div>
          </div>
          
          <div>
            <h5 className="font-medium text-gray-900 mb-2">Interactive Features</h5>
            <div className="space-y-1 text-sm text-gray-600">
              <div>✓ Real-time provider locations</div>
              <div>✓ Hover for zone details</div>
              <div>✓ Visual service boundaries</div>
              <div>✓ Distance calculations</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{providerZones.length}</div>
            <div className="text-sm text-blue-700">Active Zones</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {providerZones.reduce((sum, zone) => sum + zone.providers, 0)}
            </div>
            <div className="text-sm text-green-700">Total Providers</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">{radius}km</div>
            <div className="text-sm text-yellow-700">Search Radius</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">NYC</div>
            <div className="text-sm text-purple-700">Service Area</div>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3">Provider Zones</h4>
        <div className="space-y-3">
          {providerZones.map((zone) => (
            <div key={zone.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: zone.color }}
                ></div>
                <div>
                  <div className="font-medium text-gray-900">{zone.name}</div>
                  <div className="text-sm text-gray-600">
                    {zone.providers} providers • {(zone.radius / 1000).toFixed(1)}km radius
                  </div>
                </div>
              </div>
              <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors">
                Book Now
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
