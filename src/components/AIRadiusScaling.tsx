'use client'

import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/lib/i18n/useI18n'
import { motion } from 'framer-motion'

interface AIRadiusScalingProps {
  service: string
  location: string
  onRadiusChangeAction: (radius: number) => void
}

interface RadiusRecommendation {
  recommendedRadius: number
  explanation: string
  providerDensity: 'dense' | 'medium' | 'sparse'
}

export default function AIRadiusScaling({ service, location, onRadiusChangeAction }: AIRadiusScalingProps) {
  const [radiusRecommendation, setRadiusRecommendation] = useState<RadiusRecommendation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()

  const getProviderDensity = (location: string): 'dense' | 'medium' | 'sparse' => {
    // Simple logic - in a real app, this would be based on actual provider data
    const urbanAreas = ['new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia', 'san antonio', 'san diego', 'dallas', 'san jose']
    const suburbanAreas = ['austin', 'jacksonville', 'fort worth', 'columbus', 'charlotte', 'san francisco', 'indianapolis', 'seattle', 'denver', 'washington']
    
    const lowerLocation = location.toLowerCase()
    
    if (urbanAreas.some(area => lowerLocation.includes(area))) return 'dense'
    if (suburbanAreas.some(area => lowerLocation.includes(area))) return 'medium'
    return 'sparse'
  }

  const fetchRadiusRecommendation = useCallback(async () => {
    if (!service || !location) return

    setIsLoading(true)
    setError(null)

    try {
      const providerDensity = getProviderDensity(location)
      
      const response = await fetch('/api/ai-radius-scaling', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service,
          location,
          providerDensity,
          currentRadius: 5
        }),
      })

      // Accept 200 with success flag OR graceful fallback body
      if (!response.ok) {
        throw new Error(`Failed to get radius recommendation (${response.status})`)
      }

      const data = await response.json()
      
      if (data && data.recommendedRadius) {
        setRadiusRecommendation({
          recommendedRadius: data.recommendedRadius,
          explanation: data.explanation,
          providerDensity: data.providerDensity
        })
        onRadiusChangeAction(data.recommendedRadius)
      } else {
        throw new Error(data?.error || 'Failed to get radius recommendation')
      }
    } catch (error) {
      console.error('Radius scaling error:', error)
      setError(error instanceof Error ? error.message : 'Failed to get radius recommendation')
    } finally {
      setIsLoading(false)
    }
  }, [service, location, onRadiusChangeAction])

  useEffect(() => {
    if (service && location) {
      fetchRadiusRecommendation()
    }
  }, [service, location, fetchRadiusRecommendation])

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
          <span className="text-white text-sm">🗺️</span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{t('feature.map_protection.title')}</h3>
          <p className="text-sm text-gray-500">{t('feature.map_protection.desc')}</p>
        </div>
      </div>

      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 p-4 bg-primary/10 rounded-xl"
        >
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-primary">{t('radius.analyzing')}</span>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-red-50 rounded-xl border border-red-200"
        >
          <p className="text-sm text-red-700">⚠️ {error}</p>
          <button 
            onClick={fetchRadiusRecommendation}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            {t('buttons.try_again')}
          </button>
        </motion.div>
      )}

      {radiusRecommendation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="p-4 bg-accent/10 rounded-xl border border-accent/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">{t('radius.recommended')}</span>
              <span className="text-lg font-bold text-accent">{radiusRecommendation.recommendedRadius} km</span>
            </div>
            <p className="text-sm text-muted-foreground">{radiusRecommendation.explanation}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <span className="text-xs text-gray-500 uppercase tracking-wide">{t('label.service')}</span>
              <p className="text-sm font-medium text-gray-900">{service}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <span className="text-xs text-gray-500 uppercase tracking-wide">{t('label.provider_density')}</span>
              <p className="text-sm font-medium text-gray-900 capitalize">{t(`density.${radiusRecommendation.providerDensity}`)}</p>
            </div>
          </div>

          <div className="p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-primary">🔒</span>
              <span className="text-sm font-medium text-primary">{t('privacy.active')}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('privacy.explainer')}</p>
          </div>
        </motion.div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={fetchRadiusRecommendation}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          suppressHydrationWarning
        >
          {t('radius.refresh')}
        </button>
      </div>
    </div>
  )
} 