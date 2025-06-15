'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Persona } from '../types';

interface CustomerPersonaSelectorProps {
  showPersonaSelector: boolean;
  setShowPersonaSelector: (show: boolean) => void;
  selectedPersona: Persona | null;
  setSelectedPersona: (persona: Persona | null) => void;
}

const personas: Persona[] = [
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

export default function CustomerPersonaSelector({
  showPersonaSelector,
  setShowPersonaSelector,
  selectedPersona,
  setSelectedPersona
}: CustomerPersonaSelectorProps) {
  const handlePersonaSelect = (persona: Persona) => {
    setSelectedPersona(persona);
    setShowPersonaSelector(false);
  };

  return (
    <AnimatePresence>
      {showPersonaSelector && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Style</h2>
              <p className="text-gray-600">Select your persona to personalize your booking experience</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {personas.map((persona) => (
                <motion.button
                  key={persona.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePersonaSelect(persona)}
                  className={`p-4 rounded-xl border-2 transition-colors ${
                    selectedPersona?.id === persona.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{persona.icon}</div>
                  <div className="font-semibold text-gray-900">{persona.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{persona.description}</div>
                </motion.button>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => setShowPersonaSelector(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 