import { Provider, BookingSlot, Persona } from '../types';

export const providers: Provider[] = [
  {
    id: '1',
    name: 'Sarah\'s Salon',
    service: 'Haircut & Styling',
    category: 'hair',
    rating: 4.8,
    price: '$45',
    location: { lat: 40.7128, lng: -74.0060 },
    available: true
  },
  {
    id: '2',
    name: 'Zen Wellness Center',
    service: 'Deep Tissue Massage',
    category: 'wellness',
    rating: 4.9,
    price: '$80',
    location: { lat: 40.7150, lng: -74.0080 },
    available: true
  },
  {
    id: '3',
    name: 'Downtown Dental',
    service: 'Teeth Cleaning',
    category: 'health',
    rating: 4.7,
    price: '$120',
    location: { lat: 40.7100, lng: -74.0040 },
    available: true
  },
  {
    id: '4',
    name: 'FitLife Gym',
    service: 'Personal Training',
    category: 'fitness',
    rating: 4.6,
    price: '$60',
    location: { lat: 40.7180, lng: -74.0100 },
    available: true
  },
  {
    id: '5',
    name: 'Beauty Haven',
    service: 'Facial Treatment',
    category: 'hair',
    rating: 4.5,
    price: '$75',
    location: { lat: 40.7200, lng: -74.0120 },
    available: true
  },
  {
    id: '6',
    name: 'Relaxation Station',
    service: 'Swedish Massage',
    category: 'wellness',
    rating: 4.8,
    price: '$70',
    location: { lat: 40.7050, lng: -74.0020 },
    available: true
  },
  {
    id: '7',
    name: 'Health First Clinic',
    service: 'Physical Therapy',
    category: 'health',
    rating: 4.9,
    price: '$95',
    location: { lat: 40.7250, lng: -74.0150 },
    available: true
  },
  {
    id: '8',
    name: 'PowerFit Studio',
    service: 'Group Fitness',
    category: 'fitness',
    rating: 4.4,
    price: '$25',
    location: { lat: 40.7300, lng: -74.0180 },
    available: true
  }
];

export const bookingSlots: BookingSlot[] = [
  {
    id: 'slot1',
    time: '9:00 AM',
    available: true,
    providerId: '1'
  },
  {
    id: 'slot2',
    time: '10:00 AM',
    available: true,
    providerId: '1'
  },
  {
    id: 'slot3',
    time: '2:00 PM',
    available: true,
    providerId: '2'
  },
  {
    id: 'slot4',
    time: '3:00 PM',
    available: true,
    providerId: '2'
  },
  {
    id: 'slot5',
    time: '11:00 AM',
    available: true,
    providerId: '3'
  },
  {
    id: 'slot6',
    time: '4:00 PM',
    available: true,
    providerId: '4'
  }
];

export const personas: Persona[] = [
  {
    id: 'busy-professional',
    name: 'Busy Professional',
    description: 'Efficient, time-conscious, values quick booking',
    icon: '💼',
    tone: 'professional',
    preferences: ['quick booking', 'efficiency', 'reliability']
  },
  {
    id: 'wellness-enthusiast',
    name: 'Wellness Enthusiast',
    description: 'Health-focused, detailed, quality-conscious',
    icon: '🧘',
    tone: 'caring',
    preferences: ['quality', 'wellness', 'detailed info']
  },
  {
    id: 'spontaneous-explorer',
    name: 'Spontaneous Explorer',
    description: 'Adventurous, flexible, discovery-oriented',
    icon: '🌟',
    tone: 'exciting',
    preferences: ['discovery', 'flexibility', 'adventure']
  },
  {
    id: 'budget-conscious',
    name: 'Budget Conscious',
    description: 'Value-focused, price-aware, practical',
    icon: '💰',
    tone: 'helpful',
    preferences: ['value', 'pricing', 'practicality']
  }
]; 