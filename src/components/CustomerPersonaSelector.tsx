'use client';

import { motion } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';

const personas = [
  {
    id: 'busy-professional',
    name: 'Busy Professional',
    description: 'Quick bookings, premium slots',
    icon: '💼',
    tone: 'efficient',
    preferences: ['early morning', 'late evening', 'premium service']
  },
  {
    id: 'wellness-seeker',
    name: 'Wellness Seeker',
    description: 'Holistic services, detailed reviews',
    icon: '🧘‍♀️',
    tone: 'mindful',
    preferences: ['wellness', 'natural', 'experienced providers']
  },
  {
    id: 'social-butterfly',
    name: 'Social Butterfly',
    description: 'Group bookings, trendy spots',
    icon: '🦋',
    tone: 'energetic',
    preferences: ['group sessions', 'popular times', 'new experiences']
  },
  {
    id: 'value-optimizer',
    name: 'Value Optimizer',
    description: 'Best deals, flexible timing',
    icon: '🎯',
    tone: 'practical',
    preferences: ['off-peak hours', 'package deals', 'loyalty rewards']
  }
];

export default function CustomerPersonaSelector() {
  const {
    showPersonaSelector,
    selectedPersona,
    setShowPersonaSelector,
    setSelectedPersona
  } = useUIStore();

  if (!showPersonaSelector) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-4">Choose Your Booking Style</h2>
        <p className="text-gray-600 mb-6">Select a persona that matches your booking preferences</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {personas.map((persona) => (
            <motion.button
              key={persona.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedPersona(persona);
                setShowPersonaSelector(false);
              }}
              className={`p-4 rounded-xl border-2 text-left hover:border-blue-500 transition-colors ${
                selectedPersona?.id === persona.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="text-3xl mb-2">{persona.icon}</div>
              <h3 className="font-semibold">{persona.name}</h3>
              <p className="text-sm text-gray-600">{persona.description}</p>
            </motion.button>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowPersonaSelector(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </button>
          <p className="text-xs text-gray-400">You can change this later in settings</p>
        </div>
      </div>
    </motion.div>
  );
} 