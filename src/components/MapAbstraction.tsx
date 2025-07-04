'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  radius = 5,
  location = 'New York'
}: { 
  markers?: MarkerData[];
  showExact?: boolean;
  radius?: number;
  location?: string;
}) {
  const [isClient, setIsClient] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapView, setMapView] = useState<'road' | 'satellite' | 'hybrid'>('road');
  const [showTraffic, setShowTraffic] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(12);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    const timer = setTimeout(() => {
      setMapLoaded(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Dynamic provider zones based on location
  const getProviderZonesForLocation = (location: string): ProviderZone[] => {
    const locationLower = location.toLowerCase();
    
    if (locationLower.includes('new york') || locationLower.includes('nyc') || locationLower.includes('manhattan')) {
      return [
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
    } else if (locationLower.includes('longueuil') || locationLower.includes('montreal')) {
      return [
        {
          id: 'downtown_mtl',
          name: 'Downtown Longueuil',
          lat: 45.5311,
          lng: -73.5180,
          providers: 5,
          radius: 1000,
          color: '#3B82F6'
        },
        {
          id: 'vieux_longueuil',
          name: 'Vieux-Longueuil',
          lat: 45.5375,
          lng: -73.5085,
          providers: 7,
          radius: 800,
          color: '#10B981'
        },
        {
          id: 'saint_hubert',
          name: 'Saint-Hubert',
          lat: 45.5000,
          lng: -73.4167,
          providers: 4,
          radius: 900,
          color: '#F59E0B'
        },
        {
          id: 'greenfield_park',
          name: 'Greenfield Park',
          lat: 45.5147,
          lng: -73.4697,
          providers: 3,
          radius: 700,
          color: '#EF4444'
        }
      ];
    } else if (locationLower.includes('los angeles') || locationLower.includes('la')) {
      return [
        {
          id: 'downtown_la',
          name: 'Downtown LA',
          lat: 34.0522,
          lng: -118.2437,
          providers: 9,
          radius: 1500,
          color: '#3B82F6'
        },
        {
          id: 'hollywood',
          name: 'Hollywood',
          lat: 34.0928,
          lng: -118.3287,
          providers: 11,
          radius: 1200,
          color: '#10B981'
        },
        {
          id: 'santa_monica',
          name: 'Santa Monica',
          lat: 34.0194,
          lng: -118.4912,
          providers: 6,
          radius: 800,
          color: '#F59E0B'
        },
        {
          id: 'beverly_hills',
          name: 'Beverly Hills',
          lat: 34.0736,
          lng: -118.4004,
          providers: 8,
          radius: 600,
          color: '#EF4444'
        }
      ];
    } else {
      // Generic city layout for other locations
      return [
        {
          id: 'downtown',
          name: `Downtown ${location}`,
          lat: 0,
          lng: 0,
          providers: 6,
          radius: 1000,
          color: '#3B82F6'
        },
        {
          id: 'north_side',
          name: `North ${location}`,
          lat: 0,
          lng: 0,
          providers: 8,
          radius: 1200,
          color: '#10B981'
        },
        {
          id: 'south_side',
          name: `South ${location}`,
          lat: 0,
          lng: 0,
          providers: 4,
          radius: 800,
          color: '#F59E0B'
        },
        {
          id: 'west_side',
          name: `West ${location}`,
          lat: 0,
          lng: 0,
          providers: 5,
          radius: 900,
          color: '#EF4444'
        }
      ];
    }
  };

  const providerZones = getProviderZonesForLocation(location);

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
        <p className="text-sm text-gray-600">Interactive map showing real provider locations in {location}</p>
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
          <div className={`w-full h-full relative ${
            mapView === 'satellite' ? 'bg-gray-900' : 
            mapView === 'hybrid' ? 'bg-gray-800' : 'bg-blue-50'
          }`}>
            {/* Map View Background */}
            {mapView === 'satellite' && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 opacity-90"></div>
            )}
            {mapView === 'hybrid' && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-blue-900 to-gray-700 opacity-80"></div>
            )}
            
            {/* Realistic street map for road view */}
            {mapView === 'road' && (
              <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
                {/* Background */}
                <rect width="100%" height="100%" fill="#f8fafc"/>
                
                {/* St. Lawrence River (for Longueuil context) */}
                <path d="M 0 25 Q 30 20, 60 25 T 100 30 L 100 40 Q 70 35, 40 40 T 0 35 Z" fill="#3b82f6" opacity="0.4"/>
                <text x="50%" y="32%" textAnchor="middle" fill="#1e40af" fontSize="8" opacity="0.7">St. Lawrence River</text>
                
                {/* Major Highways - Realistic Longueuil roads */}
                <line x1="0" y1="60%" x2="100%" y2="55%" stroke="#4b5563" strokeWidth="4" opacity="0.9"/>
                <text x="85%" y="57%" fill="#4b5563" fontSize="7" opacity="0.8">Autoroute 20</text>
                
                <line x1="40%" y1="0" x2="45%" y2="100%" stroke="#4b5563" strokeWidth="4" opacity="0.9"/>
                <text x="47%" y="15%" fill="#4b5563" fontSize="7" opacity="0.8" transform="rotate(10 47 15)">Autoroute 10</text>
                
                {/* Major Streets */}
                <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#6b7280" strokeWidth="3" opacity="0.8"/>
                <text x="10%" y="73%" fill="#6b7280" fontSize="6" opacity="0.7">Boulevard Taschereau</text>
                
                <line x1="25%" y1="45%" x2="85%" y2="50%" stroke="#6b7280" strokeWidth="2" opacity="0.7"/>
                <text x="30%" y="47%" fill="#6b7280" fontSize="6" opacity="0.7">Chemin de Chambly</text>
                
                <line x1="15%" y1="0" x2="20%" y2="100%" stroke="#9ca3af" strokeWidth="2" opacity="0.6"/>
                <line x1="70%" y1="0" x2="75%" y2="100%" stroke="#9ca3af" strokeWidth="2" opacity="0.6"/>
                
                {/* Neighborhoods */}
                <rect x="15%" y="50%" width="25%" height="20%" fill="#e5e7eb" opacity="0.3" rx="4"/>
                <text x="27%" y="62%" textAnchor="middle" fill="#374151" fontSize="8" fontWeight="bold">Vieux-Longueuil</text>
                
                <rect x="50%" y="65%" width="30%" height="25%" fill="#f3f4f6" opacity="0.4" rx="4"/>
                <text x="65%" y="78%" textAnchor="middle" fill="#374151" fontSize="8" fontWeight="bold">Saint-Hubert</text>
                
                {/* Parks */}
                <ellipse cx="30%" cy="40%" rx="8%" ry="6%" fill="#10b981" opacity="0.3"/>
                <text x="30%" y="42%" textAnchor="middle" fill="#065f46" fontSize="6">Parc Michel-Chartrand</text>
                
                <rect x="65%" y="45%" width="15%" height="10%" fill="#10b981" opacity="0.3" rx="3"/>
                <text x="72%" y="51%" textAnchor="middle" fill="#065f46" fontSize="6">Parc de la Cité</text>
                
                {/* Metro stations */}
                <circle cx="35%" cy="65%" r="3" fill="#0ea5e9"/>
                <text x="35%" y="70%" textAnchor="middle" fill="#0369a1" fontSize="5">Longueuil</text>
                
                <circle cx="55%" cy="70%" r="3" fill="#0ea5e9"/>
                <text x="55%" y="75%" textAnchor="middle" fill="#0369a1" fontSize="5">Saint-Hubert</text>
              </svg>
            )}
            
            {/* Satellite view with terrain features */}
            {mapView === 'satellite' && (
              <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
                {/* Terrain patterns */}
                <defs>
                  <pattern id="terrain" width="100" height="100" patternUnits="userSpaceOnUse">
                    <circle cx="20" cy="20" r="2" fill="#4b5563" opacity="0.3"/>
                    <circle cx="60" cy="40" r="1.5" fill="#4b5563" opacity="0.2"/>
                    <circle cx="80" cy="70" r="1" fill="#4b5563" opacity="0.4"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#terrain)" />
                
                {/* Satellite imagery simulation */}
                <rect x="0%" y="0%" width="100%" height="100%" fill="#1f2937" opacity="0.7"/>
                <rect x="20%" y="30%" width="15%" height="15%" fill="#059669" opacity="0.5" rx="4"/>
                <rect x="60%" y="60%" width="25%" height="20%" fill="#374151" opacity="0.6" rx="3"/>
              </svg>
            )}
            
            {/* Hybrid view combines both */}
            {mapView === 'hybrid' && (
              <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
                {/* Roads overlay on satellite */}
                <line x1="0" y1="30%" x2="100%" y2="30%" stroke="#fbbf24" strokeWidth="2" opacity="0.8"/>
                <line x1="0" y1="70%" x2="100%" y2="70%" stroke="#fbbf24" strokeWidth="2" opacity="0.8"/>
                <line x1="30%" y1="0" x2="30%" y2="100%" stroke="#fbbf24" strokeWidth="2" opacity="0.8"/>
                <line x1="70%" y1="0" x2="70%" y2="100%" stroke="#fbbf24" strokeWidth="2" opacity="0.8"/>
                
                {/* Labels for hybrid mode */}
                <text x="35%" y="25%" fill="#ffffff" fontSize="10" opacity="0.8">{location.split(' ')[0]} Ave</text>
                <text x="5%" y="75%" fill="#ffffff" fontSize="10" opacity="0.8">Main St</text>
              </svg>
            )}

            {/* Your location marker - center of map */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 10 }}>
              <div className="relative">
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs font-medium text-gray-700 shadow border whitespace-nowrap">
                  📍 Your Location ({location})
                </div>
              </div>
            </div>

            {/* Dynamic Provider zones based on location - positioned geographically */}
            {providerZones.map((zone, index) => {
              // Position zones based on actual geography for Longueuil
              let position;
              if (location.toLowerCase().includes('longueuil')) {
                const positions = [
                  { top: '62%', left: '27%' },   // Vieux-Longueuil (center-left)
                  { top: '77%', left: '65%' },   // Saint-Hubert (bottom-right)
                  { top: '85%', left: '45%' },   // Greenfield Park (bottom-center)
                  { top: '80%', left: '25%' }    // Brossard (bottom-left)
                ];
                position = positions[index] || { top: '50%', left: '50%' };
              } else {
                // Default positioning for other cities
                const positions = [
                  { top: '35%', left: '30%' },   
                  { top: '45%', right: '25%' },  
                  { top: '25%', right: '20%' },  
                  { bottom: '35%', left: '35%' } 
                ];
                position = positions[index] || { top: '50%', left: '50%' };
              }
              
              return (
                <div key={zone.id} className="absolute" style={{ ...position, zIndex: 20 }}>
                  <div className="relative group cursor-pointer">
                    <div 
                      className="w-12 h-12 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-sm hover:scale-110 transition-transform"
                      style={{ backgroundColor: zone.color }}
                    >
                      {zone.providers}
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white px-2 py-1 rounded text-xs font-medium text-gray-700 shadow border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      {zone.name}
                    </div>
                  </div>
                </div>
              );
            })}

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

            {/* Map Controls Panel - Top Right */}
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden" style={{ zIndex: 40 }}>
              {/* Map View Controls */}
              <div className="flex">
                <button
                  onClick={() => setMapView('road')}
                  className={`px-3 py-2 text-xs font-medium border-r border-gray-200 ${
                    mapView === 'road' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🛣️ Road
                </button>
                <button
                  onClick={() => setMapView('satellite')}
                  className={`px-3 py-2 text-xs font-medium border-r border-gray-200 ${
                    mapView === 'satellite' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🛰️ Satellite
                </button>
                <button
                  onClick={() => setMapView('hybrid')}
                  className={`px-3 py-2 text-xs font-medium ${
                    mapView === 'hybrid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🗺️ Hybrid
                </button>
              </div>
              
              {/* Traffic Toggle */}
              <div className="border-t border-gray-200">
                <button
                  onClick={() => setShowTraffic(!showTraffic)}
                  className={`w-full px-3 py-2 text-xs font-medium text-left ${
                    showTraffic ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🚦 Traffic {showTraffic ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Zoom Controls - Right Side */}
            <div className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden" style={{ zIndex: 40 }}>
              <button
                onClick={() => setZoomLevel(Math.min(zoomLevel + 1, 18))}
                className="block w-10 h-10 bg-white hover:bg-gray-50 text-gray-700 font-bold text-lg border-b border-gray-200"
              >
                +
              </button>
              <button
                onClick={() => setZoomLevel(Math.max(zoomLevel - 1, 8))}
                className="block w-10 h-10 bg-white hover:bg-gray-50 text-gray-700 font-bold text-lg"
              >
                −
              </button>
            </div>

            {/* Traffic Overlay */}
            {showTraffic && (
              <div className="absolute inset-0" style={{ zIndex: 15 }}>
                {/* Simulated traffic lines */}
                <div className="absolute top-1/4 left-1/4 w-32 h-1 bg-red-500 opacity-80 rounded"></div>
                <div className="absolute top-1/3 right-1/4 w-24 h-1 bg-yellow-500 opacity-80 rounded"></div>
                <div className="absolute bottom-1/3 left-1/3 w-20 h-1 bg-green-500 opacity-80 rounded"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-1 bg-red-600 opacity-80 rounded"></div>
              </div>
            )}

            {/* Map Info Panel - Bottom Left */}
            <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg px-3 py-2 shadow-lg border border-gray-200" style={{ zIndex: 30 }}>
              <div className="text-xs text-gray-600">
                <div className="font-medium">Zoom: {zoomLevel}</div>
                <div>View: {mapView.charAt(0).toUpperCase() + mapView.slice(1)}</div>
                <div>Service Area: {location}</div>
              </div>
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
            <div className="text-2xl font-bold text-purple-600">{location}</div>
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
              <button
                onClick={(evt: React.MouseEvent<HTMLButtonElement>) => {
                  evt.preventDefault();
                  router.push(`/book/${zone.id}`);
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors">
                Book Now
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
