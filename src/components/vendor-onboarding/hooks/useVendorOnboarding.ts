import { useState, useEffect, useRef, useCallback } from 'react'
import { VendorFormData, initialData, OnboardingStep } from '../types'
import { useRouter } from 'next/navigation'

// Simple debounce implementation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null

  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

export function useVendorOnboarding() {
  const [data, setData] = useState<VendorFormData>(initialData)
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('business_info')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Track if data has changed since last save
  const lastSavedData = useRef<string>(JSON.stringify(initialData))

  // Fetch draft on mount
  useEffect(() => {
    async function fetchDraft() {
      try {
        const res = await fetch('/api/vendor/onboarding/draft')
        if (res.ok) {
          const body = await res.json()
          if (body.data && Object.keys(body.data).length > 0) {
            setData(prev => ({ ...prev, ...body.data }))
            lastSavedData.current = JSON.stringify({ ...initialData, ...body.data })
          }
          if (body.step && body.step !== 'complete') {
            setCurrentStep(body.step as OnboardingStep)
          }
        }
      } catch (err) {
        console.error('Failed to load draft:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDraft()
  }, [])

  // Save draft function
  const saveDraft = async (formData: VendorFormData, step: OnboardingStep) => {
    setIsSaving(true)
    try {
      await fetch('/api/vendor/onboarding/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, data: formData })
      })
      lastSavedData.current = JSON.stringify(formData)
    } catch (err) {
      console.error('Failed to save draft:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Debounced save
  const debouncedSaveRef = useRef(
    debounce((formData: VendorFormData, step: OnboardingStep) => {
      saveDraft(formData, step)
    }, 1000)
  )

  const updateData = useCallback((updates: Partial<VendorFormData>) => {
    setData(prev => {
      const next = { ...prev, ...updates }
      // Trigger auto-save if data changed
      if (JSON.stringify(next) !== lastSavedData.current) {
        debouncedSaveRef.current(next, currentStep)
      }
      return next
    })
  }, [currentStep])

  const setStep = (step: OnboardingStep) => {
    setCurrentStep(step)
    // Save immediately on step change
    saveDraft(data, step)
  }

  const submit = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/vendor/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Failed to complete onboarding')
      }

      router.push('/vendor/onboarding/complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsSaving(false)
    }
  }

  return {
    data,
    updateData,
    currentStep,
    setStep,
    submit,
    isLoading,
    isSaving,
    error
  }
}
