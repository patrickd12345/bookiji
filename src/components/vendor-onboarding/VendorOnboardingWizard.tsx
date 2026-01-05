'use client'

import { useState, useEffect } from 'react'
import { supabaseBrowserClient } from '@/lib/supabaseClient'
import { useVendorOnboarding } from './hooks/useVendorOnboarding'
import { BusinessInfoStep } from './steps/BusinessInfoStep'
import { SpecialtiesStep } from './steps/SpecialtiesStep'
import { HoursStep } from './steps/HoursStep'
import { AvailabilityMethodStep } from './steps/AvailabilityMethodStep'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { OnboardingStep } from './types'

export function VendorOnboardingWizard() {
  const {
    data,
    updateData,
    currentStep,
    setStep,
    submit,
    isLoading,
    isSaving,
    error
  } = useVendorOnboarding()

  const [profileId, setProfileId] = useState<string | null>(null)

  useEffect(() => {
    supabaseBrowserClient().auth.getUser().then(({ data }) => {
      setProfileId(data.user?.id || null)
    })
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'business_info':
        return <BusinessInfoStep data={data} onChange={updateData} />
      case 'specialties':
        return <SpecialtiesStep data={data} onChange={updateData} />
      case 'availability':
        return <AvailabilityMethodStep data={data} onChange={updateData} profileId={profileId} />
      case 'hours':
        return <HoursStep data={data} onChange={updateData} />
      default:
        return null
    }
  }

  const canContinue = () => {
    if (currentStep === 'business_info') {
      return !!data.business_name && !!data.contact_name && !!data.email
    }
    if (currentStep === 'specialties') {
      return data.specialties.length > 0
    }
    if (currentStep === 'availability') {
      return !!data.availability_method
    }
    return true
  }

  const getNextStep = (): OnboardingStep | null => {
    if (currentStep === 'business_info') return 'specialties'
    if (currentStep === 'specialties') return 'availability'
    if (currentStep === 'availability') {
        if (data.availability_method === 'calendar') return null // End of flow
        return 'hours'
    }
    return null // End of flow
  }

  const getPrevStep = (): OnboardingStep | null => {
      if (currentStep === 'hours') return 'availability'
      if (currentStep === 'availability') return 'specialties'
      if (currentStep === 'specialties') return 'business_info'
      return null
  }

  const handleNext = () => {
      const next = getNextStep()
      if (next) {
          setStep(next)
      } else {
          submit()
      }
  }

  const handleBack = () => {
      const prev = getPrevStep()
      if (prev) {
          setStep(prev)
      }
  }

  // Calculate progress
  const getProgress = () => {
      switch(currentStep) {
          case 'business_info': return 25
          case 'specialties': return 50
          case 'availability': return 75
          case 'hours': return 100
          default: return 0
      }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Provider Onboarding</h1>
        <p className="text-gray-600">
          {currentStep === 'business_info' && 'Step 1: Business Information'}
          {currentStep === 'specialties' && 'Step 2: Services & Specialties'}
          {currentStep === 'availability' && 'Step 3: Availability Method'}
          {currentStep === 'hours' && 'Step 4: Business Hours'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-6">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${getProgress()}%` }}
        ></div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {renderStep()}

      <div className="flex justify-between items-center pt-4">
        {currentStep !== 'business_info' ? (
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isSaving}
          >
            Back
          </Button>
        ) : <div></div>}

        <div className="flex items-center gap-4">
          {isSaving && <span className="text-sm text-gray-500 italic">Saving draft...</span>}

            <Button
              onClick={handleNext}
              disabled={!canContinue() || isSaving}
              className={(!getNextStep()) ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {!getNextStep()
                ? (isSaving ? 'Completing...' : 'Complete Onboarding')
                : 'Next'
              }
            </Button>
        </div>
      </div>
    </div>
  )
}
