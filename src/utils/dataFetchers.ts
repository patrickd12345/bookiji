import { supabase } from '@/lib/supabaseClient';
import type { Provider, Zone, RadiusZone } from '../types/global.d';

export const fetchNearbyProviders = async (lat: number, lng: number, radius: number): Promise<Provider[]> => {
  // Using Postgres earth distance functions (requires cube and earthdistance extensions)
  const { data: providers, error } = await supabase
    .rpc('get_providers_within_radius', {
      p_latitude: lat,
      p_longitude: lng,
      p_radius_km: radius
    });

  if (error) {
    console.error('Error fetching nearby providers:', error);
    return [];
  }

  return providers || [];
};

export const calculateRadiusZone = async (lat: number, lng: number): Promise<RadiusZone> => {
  // Get counts at different radii
  const [twoKm, fiveKm] = await Promise.all([
    fetchNearbyProviders(lat, lng, 2),
    fetchNearbyProviders(lat, lng, 5),
    fetchNearbyProviders(lat, lng, 10)
  ]);

  if (twoKm.length >= 8) {
    return {
      radius: 2,
      density: 'dense',
      description: 'High provider density - small radius for precision',
      tone: 'specific'
    };
  } else if (fiveKm.length >= 4) {
    return {
      radius: 5,
      density: 'medium',
      description: 'Moderate provider density - balanced radius',
      tone: 'balanced'
    };
  } else {
    return {
      radius: 10,
      density: 'sparse',
      description: 'Low provider density - expanded radius for options',
      tone: 'vague'
    };
  }
};

export const generateAvailabilityDescription = async (zone: RadiusZone, userLocation: { lat: number; lng: number }): Promise<string> => {
  const providers = await fetchNearbyProviders(userLocation.lat, userLocation.lng, zone.radius);
  
  switch (zone.tone) {
    case 'specific':
      return `${providers.length} open slots within ${zone.radius}km`;
    case 'balanced':
      return `Providers near you with live availability`;
    case 'vague':
      return `An opening is available nearby — lock it in to see details`;
    default:
      return `Availability in your area`;
  }
};

export const fetchAvailabilityZones = async (userLocation: { lat: number; lng: number }): Promise<Zone[]> => {
  const radiusZone = await calculateRadiusZone(userLocation.lat, userLocation.lng);
  
  // Get providers for each sub-zone
  const providers = await fetchNearbyProviders(userLocation.lat, userLocation.lng, radiusZone.radius);
  
  // Group providers by approximate neighborhoods (0.01 degrees ≈ 1km)
  const neighborhoodSize = 0.01;
  const zones = providers.reduce((acc: { [key: string]: Provider[] }, provider) => {
    const neighborhoodLat = Math.round(provider.location.lat / neighborhoodSize) * neighborhoodSize;
    const neighborhoodLng = Math.round(provider.location.lng / neighborhoodSize) * neighborhoodSize;
    const neighborhoodKey = `${neighborhoodLat},${neighborhoodLng}`;
    
    if (!acc[neighborhoodKey]) acc[neighborhoodKey] = [];
    acc[neighborhoodKey].push(provider);
    return acc;
  }, {});

  // Convert grouped providers into zones
  return Object.entries(zones).map(([coords, areaProviders], index) => {
    const [lat, lng] = coords.split(',').map(Number);
    const distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
    const direction = getCardinalDirection(userLocation.lat, userLocation.lng, lat, lng);
    
    return {
      id: `zone-${index + 1}`,
      name: `${direction} Area`,
      type: 'area' as const,
      description: `${areaProviders.length} providers in the ${direction.toLowerCase()} area`,
      count: areaProviders.length,
      distance,
      abstracted: false,
      radius: radiusZone.radius / 2,
      center: { lat, lng },
      providers: areaProviders,
      availableSlots: areaProviders.reduce((sum, p) => 
        sum + (p.availability?.[0]?.slots?.length || 0), 0
      )
    };
  }).sort((a, b) => a.distance - b.distance); // Sort by distance from user
};

// Helper function to calculate distance between two points
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Helper function to get cardinal direction
function getCardinalDirection(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
  const latDiff = toLat - fromLat;
  const lngDiff = toLng - fromLng;
  
  if (Math.abs(latDiff) > Math.abs(lngDiff)) {
    return latDiff > 0 ? 'North' : 'South';
  } else {
    return lngDiff > 0 ? 'East' : 'West';
  }
} 