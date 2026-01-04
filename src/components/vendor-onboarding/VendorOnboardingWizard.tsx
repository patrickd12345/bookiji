'use client'

import { useVendorOnboarding } from './hooks/useVendorOnboarding'
import { BusinessInfoStep } from './steps/BusinessInfoStep'
import { SpecialtiesStep } from './steps/SpecialtiesStep'
import { HoursStep } from './steps/HoursStep'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

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
    return true
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Provider Onboarding</h1>
        <p className="text-gray-600">
          {currentStep === 'business_info' && 'Step 1: Business Information'}
          {currentStep === 'specialties' && 'Step 2: Services & Specialties'}
          {currentStep === 'hours' && 'Step 3: Business Hours'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-6">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: currentStep === 'business_info' ? '33%' : currentStep === 'specialties' ? '66%' : '100%' }}
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
            onClick={() => setStep(currentStep === 'hours' ? 'specialties' : 'business_info')}
            disabled={isSaving}
          >
            Back
          </Button>
        ) : <div></div>}

        <div className="flex items-center gap-4">
          {isSaving && <span className="text-sm text-gray-500 italic">Saving draft...</span>}

          {currentStep !== 'hours' ? (
            <Button
              onClick={() => setStep(currentStep === 'business_info' ? 'specialties' : 'hours')}
              disabled={!canContinue() || isSaving}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? 'Completing...' : 'Complete Onboarding'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
