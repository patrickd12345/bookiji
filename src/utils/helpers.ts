import { Provider, RadiusZone, AvailabilityZone } from '../types';

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

export const generateAvailabilityZones = (providers: Provider[], radiusZone: RadiusZone, userLocation: { lat: number; lng: number }): AvailabilityZone[] => {
  const nearbyProviders = providers.filter(provider => {
    const distance = calculateDistance(userLocation.lat, userLocation.lng, provider.location.lat, provider.location.lng);
    return distance <= radiusZone.radius;
  });

  const zones: AvailabilityZone[] = [];

  // Group by service category
  const serviceGroups = nearbyProviders.reduce((acc, provider) => {
    const category = provider.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(provider);
    return acc;
  }, {} as Record<string, Provider[]>);

  // Create abstracted service zones
  Object.entries(serviceGroups).forEach(([category, providers]) => {
    const avgDistance = providers.reduce((sum, p) => {
      return sum + calculateDistance(userLocation.lat, userLocation.lng, p.location.lat, p.location.lng);
    }, 0) / providers.length;

    const serviceNames = {
      hair: 'Hair & Beauty',
      wellness: 'Wellness & Massage',
      health: 'Health & Dental',
      fitness: 'Fitness & Training'
    };

    zones.push({
      id: `service-${category}`,
      type: 'service',
      description: `${serviceNames[category as keyof typeof serviceNames]} services`,
      count: providers.length,
      distance: avgDistance,
      abstracted: true
    });
  });

  // Create time-based zones (morning, afternoon, evening)
  const timeZones = [
    { name: 'Morning slots', time: '9 AM - 12 PM', count: Math.floor(nearbyProviders.length * 0.3) },
    { name: 'Afternoon slots', time: '12 PM - 5 PM', count: Math.floor(nearbyProviders.length * 0.4) },
    { name: 'Evening slots', time: '5 PM - 9 PM', count: Math.floor(nearbyProviders.length * 0.3) }
  ];

  timeZones.forEach((timeZone, index) => {
    if (timeZone.count > 0) {
      zones.push({
        id: `time-${index}`,
        type: 'time',
        description: `${timeZone.name} (${timeZone.time})`,
        count: timeZone.count,
        distance: radiusZone.radius / 2,
        abstracted: true
      });
    }
  });

  return zones;
};

export const generateAIResponse = (input: string): string => {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('massage') || lowerInput.includes('wellness')) {
    return "I found 3 wellness providers near you with availability today. Would you like to see massage options or other wellness services?";
  } else if (lowerInput.includes('hair') || lowerInput.includes('beauty')) {
    return "Great! I see 5 hair and beauty providers in your area. What type of service are you looking for?";
  } else if (lowerInput.includes('time') || lowerInput.includes('when')) {
    return "I can help you find available slots. What time works best for you today?";
  } else {
    return "I can help you find available providers near you. What type of service are you looking for?";
  }
}; 