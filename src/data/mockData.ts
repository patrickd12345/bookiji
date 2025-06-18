import { Provider, Persona } from '@/types/global.d';

export const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'p1',
    name: 'Downtown Spa',
    services: [
      {
        id: 'service-1',
        name: 'Basic Massage',
        category: 'wellness',
        price: 80,
        duration: 60,
        description: 'A relaxing Swedish massage',
        isActive: true
      },
      {
        id: 'service-2',
        name: 'Premium Facial',
        category: 'wellness',
        price: 120,
        duration: 90,
        description: 'Luxury facial treatment',
        isActive: true
      }
    ],
    category: 'wellness',
    rating: 4.8,
    price: '$80-$120',
    location: { lat: 45.5017, lng: -73.5673 },
    availability: [
      {
        date: new Date().toISOString().split('T')[0],
        slots: ['10:00', '14:00', '16:00']
      }
    ],
    isActive: true
  }
];

export const MOCK_PERSONAS: Persona[] = [
  {
    id: 'persona1',
    name: 'Wellness Seeker',
    description: 'Looking for relaxation and self-care services',
    icon: '🧘‍♀️',
    tone: 'calm',
    preferences: ['massage', 'yoga', 'meditation']
  },
  {
    id: 'persona2',
    name: 'Fitness Enthusiast',
    description: 'Focused on physical fitness and training',
    icon: '💪',
    tone: 'energetic',
    preferences: ['personal training', 'group fitness', 'nutrition']
  },
  {
    id: 'persona3',
    name: 'Beauty Maven',
    description: 'Interested in beauty and skincare services',
    icon: '💅',
    tone: 'sophisticated',
    preferences: ['facial', 'manicure', 'hair styling']
  }
]; 