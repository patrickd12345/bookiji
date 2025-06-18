import type { Provider, Zone, RadiusZone } from '../types/global.d';

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

export const calculateRadiusZone = (providers: Provider[], lat: number, lng: number): RadiusZone => {
  const nearbyProviders = providers.filter(provider => {
    const distance = calculateDistance(lat, lng, provider.location.lat, provider.location.lng);
    return distance <= 10; // Check within 10km
  });

  if (nearbyProviders.length >= 8) {
    return {
      radius: 2,
      density: 'dense',
      description: 'High provider density - small radius for precision',
      tone: 'specific'
    };
  } else if (nearbyProviders.length >= 4) {
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

export const generateAvailabilityDescription = (zone: RadiusZone, providers: Provider[], userLocation: { lat: number; lng: number }): string => {
  const nearbyProviders = providers.filter(provider => {
    const distance = calculateDistance(userLocation.lat, userLocation.lng, provider.location.lat, provider.location.lng);
    return distance <= zone.radius;
  });
  
  switch (zone.tone) {
    case 'specific':
      return `${nearbyProviders.length} open slots within ${zone.radius}km`;
    case 'balanced':
      return `Providers near you with live availability`;
    case 'vague':
      return `An opening is available nearby — lock it in to see details`;
    default:
      return `Availability in your area`;
  }
};

export function generateAvailabilityZones(userLocation: { lat: number; lng: number }): Zone[] {
  // Generate mock zones around the user's location
  const zones: Zone[] = [
    {
      id: 'zone1',
      name: 'Downtown',
      type: 'area',
      description: 'High density urban area',
      count: 15,
      distance: 0.5,
      abstracted: false,
      radius: 1,
      center: { lat: userLocation.lat + 0.01, lng: userLocation.lng + 0.01 },
      providers: generateMockProviders(5),
      availableSlots: 25
    },
    {
      id: 'zone2',
      name: 'Midtown',
      type: 'area',
      description: 'Mixed residential and commercial',
      count: 10,
      distance: 1.2,
      abstracted: false,
      radius: 2,
      center: { lat: userLocation.lat - 0.01, lng: userLocation.lng - 0.01 },
      providers: generateMockProviders(3),
      availableSlots: 18
    },
    {
      id: 'zone3',
      name: 'Suburbs',
      type: 'area',
      description: 'Residential area',
      count: 5,
      distance: 2.5,
      abstracted: false,
      radius: 3,
      center: { lat: userLocation.lat + 0.02, lng: userLocation.lng + 0.02 },
      providers: generateMockProviders(2),
      availableSlots: 12
    }
  ];

  return zones;
}

function generateMockProviders(count: number): Provider[] {
  const providers: Provider[] = [];
  const categories = ['hair', 'wellness', 'health', 'fitness'] as const;

  for (let i = 0; i < count; i++) {
    providers.push({
      id: `provider-${i + 1}`,
      name: `Provider ${i + 1}`,
      services: [
        {
          id: `service-${i}-1`,
          name: 'Basic Service',
          category: categories[i % categories.length],
          price: 50,
          duration: 60,
          description: 'A basic service offering',
          isActive: true
        },
        {
          id: `service-${i}-2`,
          name: 'Premium Service',
          category: categories[i % categories.length],
          price: 100,
          duration: 90,
          description: 'A premium service offering',
          isActive: true
        }
      ],
      category: categories[i % categories.length],
      rating: 4.5,
      price: '$50-$100',
      location: { lat: 45.5017 + (i * 0.001), lng: -73.5673 + (i * 0.001) },
      availability: [
        {
          date: new Date().toISOString().split('T')[0],
          slots: ['09:00', '10:00', '11:00', '14:00', '15:00']
        },
        {
          date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          slots: ['09:00', '10:00', '11:00', '14:00', '15:00']
        }
      ],
      isActive: true
    });
  }

  return providers;
}

export const generateAIResponse = (input: string): string => {
  // Simple mock AI response generator
  const responses = [
    'I understand you\'re looking for a service. Let me help you find the right provider.',
    'Based on your preferences, I recommend checking out our wellness services.',
    'Would you like me to show you available slots in your area?',
    'I can help you book an appointment with one of our top-rated providers.'
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}; 