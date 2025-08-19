import { useState, useEffect } from 'react'

export interface TourStep {
  target: string
  content: string
  title?: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export interface Tour {
  id: string
  name?: string
  title?: string
  route?: string
  steps: TourStep[]
  autoStart?: boolean
}

// Simple tour registry
const tourRegistry: Map<string, Tour> = new Map()

export function registerTour(tour: Tour) {
  tourRegistry.set(tour.id, tour)
}

export function useAutoTour(tourId: string) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [tour, setTour] = useState<Tour | null>(null)

  useEffect(() => {
    const registeredTour = tourRegistry.get(tourId)
    if (registeredTour) {
      setTour(registeredTour)
      if (registeredTour.autoStart) {
        setIsActive(true)
      }
    }
  }, [tourId])

  const startTour = () => {
    setIsActive(true)
    setCurrentStep(0)
  }

  const nextStep = () => {
    if (tour && currentStep < tour.steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      endTour()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const endTour = () => {
    setIsActive(false)
    setCurrentStep(0)
  }

  const goToStep = (stepIndex: number) => {
    if (tour && stepIndex >= 0 && stepIndex < tour.steps.length) {
      setCurrentStep(stepIndex)
    }
  }

  return {
    isActive,
    currentStep,
    tour,
    startTour,
    nextStep,
    prevStep,
    endTour,
    goToStep,
    isLastStep: tour ? currentStep === tour.steps.length - 1 : false,
    isFirstStep: currentStep === 0
  }
}

export function useGuidedTour(tourId: string) {
  return useAutoTour(tourId)
}
