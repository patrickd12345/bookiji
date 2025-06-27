'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface CustomerPersonaAIProps {
  onPersonaChangeAction: (persona: string) => void
  onMessageAction: (message: string) => void
  currentService?: string
}

interface PersonaOption {
  id: string
  name: string
  description: string
  icon: string
  characteristics: string[]
}

const PERSONA_OPTIONS: PersonaOption[] = [
  {
    id: 'busy-professional',
    name: 'Busy Professional',
    description: 'Time-conscious, values convenience and premium quality',
    icon: '💼',
    characteristics: ['Convenience-focused', 'Premium quality', 'Time-efficient', 'Professional service']
  },
  {
    id: 'budget-conscious',
    name: 'Budget Conscious',
    description: 'Value-focused, looks for deals and cost-effective options',
    icon: '💰',
    characteristics: ['Cost-effective', 'Deals & discounts', 'Clear pricing', 'Value for money']
  },
  {
    id: 'wellness-focused',
    name: 'Wellness Focused',
    description: 'Health-oriented, prefers organic and holistic approaches',
    icon: '🧘‍♀️',
    characteristics: ['Health benefits', 'Organic options', 'Holistic approach', 'Quality focus']
  },
  {
    id: 'tech-savvy',
    name: 'Tech Savvy',
    description: 'Loves modern features and digital convenience',
    icon: '📱',
    characteristics: ['Digital features', 'App benefits', 'Innovation', 'Modern convenience']
  },
  {
    id: 'traditional',
    name: 'Traditional',
    description: 'Values trust, reliability, and personal touch',
    icon: '🤝',
    characteristics: ['Trust & reliability', 'Personal touch', 'Established providers', 'Traditional values']
  },
  {
    id: 'general',
    name: 'General',
    description: 'Balanced approach, open to various options',
    icon: '👤',
    characteristics: ['Balanced approach', 'Flexible', 'Friendly', 'Standard recommendations']
  }
]

export default function CustomerPersonaAI({ onPersonaChangeAction, onMessageAction, currentService }: CustomerPersonaAIProps) {
  const [selectedPersona, setSelectedPersona] = useState<string>('general')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [personaInsights, setPersonaInsights] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePersonaSelect = async (persona: string) => {
    setSelectedPersona(persona)
    onPersonaChangeAction(persona)
    
    // Generate AI insights for the selected persona
    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/ai-persona', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `I'm a ${persona} customer looking for services. What should I know about booking with Bookiji?`,
          persona,
          service: currentService,
          userHistory: []
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get persona insights')
      }

      const data = await response.json()
      
      if (data.success) {
        setPersonaInsights(data.response)
      } else {
        throw new Error(data.error || 'Failed to get persona insights')
      }
    } catch (error) {
      console.error('Persona analysis error:', error)
      setError(error instanceof Error ? error.message : 'Failed to get persona insights')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleQuickMessage = (message: string) => {
    onMessageAction(message)
  }

  const getPersonaQuickMessages = (persona: string): string[] => {
    const quickMessages = {
      'busy-professional': [
        'Show me premium providers near me',
        'What\'s the fastest booking option?',
        'I need a service today'
      ],
      'budget-conscious': [
        'Show me the best deals',
        'What are the most affordable options?',
        'Any discounts available?'
      ],
      'wellness-focused': [
        'Show me wellness services',
        'I prefer organic/natural options',
        'What are the health benefits?'
      ],
      'tech-savvy': [
        'What are the app features?',
        'Show me digital booking options',
        'Any innovative services?'
      ],
      'traditional': [
        'Show me established providers',
        'I prefer trusted, reliable services',
        'What about personal recommendations?'
      ],
      'general': [
        'What services are available?',
        'Show me nearby providers',
        'How does booking work?'
      ]
    }
    return quickMessages[persona as keyof typeof quickMessages] || quickMessages.general
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
          <span className="text-white text-sm">👤</span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">AI-Powered Personalization</h3>
          <p className="text-sm text-gray-500">Get personalized recommendations based on your preferences</p>
        </div>
      </div>

      {/* Persona Selection */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Select Your Profile</h4>
        <div className="grid grid-cols-2 gap-3">
          {PERSONA_OPTIONS.map((persona) => (
            <motion.button
              key={persona.id}
              onClick={() => handlePersonaSelect(persona.id)}
              className={`p-3 rounded-xl border-2 transition-all ${
                selectedPersona === persona.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{persona.icon}</span>
                <span className="text-sm font-medium text-gray-900">{persona.name}</span>
              </div>
              <p className="text-xs text-gray-600 text-left">{persona.description}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl mb-4"
        >
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-purple-700">Analyzing your preferences...</span>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-red-50 rounded-xl border border-red-200 mb-4"
        >
          <p className="text-sm text-red-700">⚠️ {error}</p>
        </motion.div>
      )}

      {personaInsights && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-purple-50 rounded-xl border border-purple-200 mb-4"
        >
          <div className="flex items-start gap-3">
            <span className="text-purple-600 text-lg">💡</span>
            <div>
              <h4 className="text-sm font-medium text-purple-900 mb-1">Personalized Insights</h4>
              <p className="text-sm text-purple-700">{personaInsights}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Messages */}
      {selectedPersona && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Quick Messages</h4>
          <div className="flex flex-wrap gap-2">
            {getPersonaQuickMessages(selectedPersona).map((message, index) => (
              <button
                key={index}
                onClick={() => handleQuickMessage(message)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors"
              >
                {message}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Persona Characteristics */}
      {selectedPersona && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Your Profile</h4>
          <div className="flex flex-wrap gap-2">
            {PERSONA_OPTIONS.find(p => p.id === selectedPersona)?.characteristics.map((char, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
              >
                {char}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 