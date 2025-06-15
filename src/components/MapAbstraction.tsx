'use client';

import { motion } from 'framer-motion';
import { AvailabilityZone, Provider, RadiusZone } from '../types';

interface MapAbstractionProps {
  availabilityZones: AvailabilityZone[];
  selectedZone: AvailabilityZone | null;
  setSelectedZone: (zone: AvailabilityZone | null) => void;
  showProviderDetails: boolean;
  setShowProviderDetails: (show: boolean) => void;
  selectedProvider: Provider | null;
  setSelectedProvider: (provider: Provider | null) => void;
  currentRadiusZone: RadiusZone | null;
  availableSlots: string[];
  providers: Provider[];
  userLocation: { lat: number; lng: number };
  onBookZone: () => void;
}

export default function MapAbstraction({
  availabilityZones,
  selectedZone,
  setSelectedZone,
  showProviderDetails,
  setShowProviderDetails,
  selectedProvider,
  setSelectedProvider,
  currentRadiusZone,
  availableSlots,
  providers,
  userLocation,
  onBookZone
}: MapAbstractionProps) {
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleZoneSelect = (zone: AvailabilityZone) => {
    setSelectedZone(zone);
    setShowProviderDetails(true);
    
    // In real app, this would show available providers for this zone
    // but still abstracted until booking
    const nearbyProviders = providers.filter(provider => {
      const distance = calculateDistance(userLocation.lat, userLocation.lng, provider.location.lat, provider.location.lng);
      return distance <= (currentRadiusZone?.radius || 5);
    });

    if (zone.type === 'service') {
      const categoryProviders = nearbyProviders.filter(p => p.category === zone.id.split('-')[1]);
      setSelectedProvider(categoryProviders[0] || null);
    } else {
      setSelectedProvider(nearbyProviders[0] || null);
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Radius Scaling Display */}
      {currentRadiusZone && (
        <div className="mb-4 p-3 bg-white rounded-lg border border-gray-300">
          <div className="text-sm text-gray-700 mb-2">
            <strong>AI Radius:</strong> {currentRadiusZone.radius}km ({currentRadiusZone.density} area)
          </div>
          <div className="text-xs text-gray-600 mb-2">
            {currentRadiusZone.description}
          </div>
          <div className="text-sm font-medium text-blue-600">
            {availableSlots[0]}
          </div>
        </div>
      )}
      
      <p className="text-gray-500 mb-4">Mapbox integration coming soon</p>
      
      {/* Abstracted Availability Zones */}
      <div className="space-y-3 mb-4">
        <h4 className="text-sm font-semibold text-gray-700">Available Zones</h4>
        {availabilityZones.map((zone) => (
          <div
            key={zone.id}
            onClick={() => handleZoneSelect(zone)}
            className={`p-3 rounded-lg cursor-pointer transition-colors border-2 ${
              selectedZone?.id === zone.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{zone.description}</div>
                <div className="text-sm text-gray-600">
                  {zone.count} {zone.type === 'service' ? 'providers' : 'slots'} available
                </div>
                <div className="text-xs text-gray-500">
                  ~{zone.distance.toFixed(1)}km away
                </div>
              </div>
              <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                {zone.type}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Booking Button for Selected Zone */}
      {selectedZone && (
        <div className="mb-4">
          <button
            onClick={onBookZone}
            className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Book {selectedZone.description} - $1 commitment
          </button>
          <div className="text-xs text-gray-500 mt-1 text-center">
            Provider details revealed after booking
          </div>
        </div>
      )}
      
      {/* Provider Details (only shown after zone selection) */}
      {showProviderDetails && selectedProvider && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-900 mb-2">
            Selected Provider (Abstracted)
          </div>
          <div className="text-xs text-gray-600">
            <div>Service: {selectedProvider.service}</div>
            <div>Rating: {selectedProvider.rating} ⭐</div>
            <div>Price: {selectedProvider.price}</div>
            <div className="text-blue-600 font-medium">
              Exact location and name revealed after $1 commitment
            </div>
          </div>
        </div>
      )}
      
      {/* Radius Zone Info */}
      {currentRadiusZone && (
        <div className="text-xs text-gray-500">
          <div>Density: {currentRadiusZone.density}</div>
          <div>Tone: {currentRadiusZone.tone}</div>
          <div>Zones: {availabilityZones.length}</div>
        </div>
      )}
    </div>
  );
} 