'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export interface TourStep {
  id: string
  target: string // CSS selector or element ID
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  action?: () => void
}

export interface Tour {
  id: string
  name: string
  steps: TourStep[]
}

interface TourContextType {
  activeTour: Tour | null
  currentStep: number
  isRunning: boolean
  startTour: (tour: Tour) => void
  nextStep: () => void
  previousStep: () => void
  endTour: () => void
  skipTour: () => void
}

const TourContext = createContext<TourContextType | undefined>(undefined)

export function TourProvider({ children }: { children: ReactNode }) {
  const [activeTour, setActiveTour] = useState<Tour | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  const startTour = (tour: Tour) => {
    setActiveTour(tour)
    setCurrentStep(0)
    setIsRunning(true)
  }

  const nextStep = () => {
    if (!activeTour) return
    
    if (currentStep < activeTour.steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      endTour()
    }
  }

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const endTour = () => {
    setIsRunning(false)
    setActiveTour(null)
    setCurrentStep(0)
  }

  const skipTour = () => {
    endTour()
  }

  return (
    <TourContext.Provider
      value={{
        activeTour,
        currentStep,
        isRunning,
        startTour,
        nextStep,
        previousStep,
        endTour,
        skipTour,
      }}
    >
      {children}
    </TourContext.Provider>
  )
}

export function useTour() {
  const context = useContext(TourContext)
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider')
  }
  return context
}
