import type { Provider, Zone } from '../types/global.d';
import { calculateDistance, calculateRadiusZone, generateAvailabilityDescription, fetchAvailabilityZones } from './dataFetchers';

export {
  calculateDistance,
  calculateRadiusZone,
  generateAvailabilityDescription,
  fetchAvailabilityZones
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

export const generateAIResponse = (): string => {
  // Simple mock AI response generator
  const responses = [
    'I understand you\'re looking for a service. Let me help you find the right provider.',
    'Based on your preferences, I recommend checking out our wellness services.',
    'Would you like me to show you available slots in your area?',
    'I can help you book an appointment with one of our top-rated providers.'
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}; 