'use client'

import { useEffect, useRef, useCallback } from 'react'
import 'shepherd.js/dist/css/shepherd.css';

let globalTourInitialized = false

interface TourStep {
  id: string
  target: string
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

interface ShepherdTourProps {
  steps: TourStep[]
  run?: boolean
  onComplete?: () => void
  onSkip?: () => void
  autoStart?: boolean
}

interface TourInstance {
  start: () => void
  cancel: () => void
  complete: () => void
  back: () => void
  next: () => void
  addStep: (config: Record<string, unknown>) => void
  isActive?: () => boolean
}

export default function ShepherdTour({ 
  steps, 
  run = false, 
  onComplete, 
  onSkip,
  autoStart = false 
}: ShepherdTourProps) {
  const tourRef = useRef<TourInstance | null>(null)
  const shepherdRef = useRef<unknown>(null)
  const startingRef = useRef<boolean>(false)

  const cleanupTour = useCallback(() => {
    if (tourRef.current) {
      console.log('🧹 Cleaning up existing tour')
      try {
        if (run && tourRef.current.isActive && tourRef.current.isActive()) {
          console.log('⚠️ Skipping cleanup - tour is currently active')
          return
        }
        tourRef.current.complete()
        tourRef.current = null
        startingRef.current = false
      } catch (error) {
        console.log('⚠️ Error during tour cleanup:', error)
        startingRef.current = false
      }
    }
  }, [run])

  useEffect(() => {
    console.log('🔧 Initializing Shepherd tour with steps:', steps.length)
    
    if (globalTourInitialized && tourRef.current) {
      console.log('⚠️ Skipping initialization - tour already initialized globally')
      return
    }
    
    if (tourRef.current && !run) {
      console.log('⚠️ Skipping initialization - tour already exists and not running')
      return
    }

    cleanupTour()
    
    import('shepherd.js').then((ShepherdModule) => {
      const Shepherd = ShepherdModule.default
      shepherdRef.current = Shepherd
      console.log('✅ Shepherd loaded:', Shepherd)

      if (Shepherd.activeTour) {
        console.log('🧹 Destroying existing global tour')
        Shepherd.activeTour.complete()
      }

      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          classes: 'shepherd-theme-custom',
          scrollTo: { behavior: 'smooth', block: 'center' },
          cancelIcon: {
            enabled: true,
          },
          modalOverlayOpeningPadding: 10,
          modalOverlayOpeningRadius: 8,
        }
      })

      console.log('✅ Tour instance created:', tour)

      steps.forEach((step, index) => {
        const isLast = index === steps.length - 1
        const isFirst = index === 0

        const stepConfig: Record<string, unknown> = {
          id: step.id,
          title: step.title,
          text: step.content,
          buttons: [
            ...(isFirst ? [] : [{
              text: 'Previous',
              classes: 'shepherd-button-secondary',
              action() {
                console.log('⬅️ Previous button clicked')
                tour.back()
              }
            }]),
            {
              text: 'Skip',
              classes: 'shepherd-button-secondary',
              action: () => {
                console.log('⏭️ Skip button clicked')
                tour.cancel()
                onSkip?.()
              }
            },
            {
              text: isLast ? 'Finish' : 'Next',
              classes: 'shepherd-button-primary',
              action() {
                console.log('➡️ Next/Finish button clicked, isLast:', isLast)
                if (isLast) {
                  tour.complete()
                  onComplete?.()
                } else {
                  tour.next()
                }
              }
            }
          ],
          when: {
            show: () => {
              console.log('👁️ Showing step:', step.id, 'Target:', step.target)
              const element = document.querySelector(step.target)
              if (element) {
                console.log('✅ Element found:', element)
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
              } else {
                console.log('❌ Element not found for:', step.target)
              }
            }
          }
        }

        if (step.placement !== 'center') {
          stepConfig.attachTo = {
            element: step.target,
            on: step.placement || 'bottom'
          }
        }

        console.log('➕ Adding step:', step.id, stepConfig)
        tour.addStep(stepConfig)
      })

      tour.on('complete', () => {
        console.log('🎉 Tour completed')
        localStorage.setItem('bookiji_tour_completed', 'true')
        startingRef.current = false
        tourRef.current = null
        onComplete?.()
      })

      tour.on('cancel', () => {
        console.log('❌ Tour cancelled')
        startingRef.current = false
        tourRef.current = null
        onSkip?.()
      })

      tour.on('start', () => {
        console.log('🚀 Tour started - clearing starting flag')
        startingRef.current = false
      })

      tour.on('show', (event: { step?: { id?: string } }) => {
        console.log('👀 Step shown:', event.step?.id)
      })

      tourRef.current = tour
      console.log('✅ Tour setup complete')
      
      globalTourInitialized = true

      if (run) {
        console.log('🚀 Starting tour immediately (run was already true)')
        tour.start()
      }

    }).catch((error) => {
      console.error('❌ Failed to load Shepherd:', error)
    })

    return () => {
      cleanupTour()
    }
  }, [steps, onComplete, onSkip, cleanupTour, run])

  useEffect(() => {
    console.log('🎮 Run effect triggered, run:', run, 'tourRef.current:', !!tourRef.current)
    console.log('🎮 Current tour state - run:', run, 'tourExists:', !!tourRef.current, 'starting:', startingRef.current)
    
    if (run && tourRef.current && !startingRef.current) {
      startingRef.current = true
      console.log('🔒 Setting starting flag - DETERMINISTIC START')
      
      // Add a small delay to ensure DOM is ready and avoid React Fast Refresh conflicts
      const startTimeout = setTimeout(() => {
        try {
          if (tourRef.current && run) { // Double-check conditions
            console.log('🚀 Starting tour after delay via run prop')
            tourRef.current.start()
            console.log('✅ Tour start command executed successfully')
          } else {
            console.log('⚠️ Tour conditions changed during delay, aborting start')
            startingRef.current = false
          }
        } catch (error) {
          console.error('❌ Error starting tour:', error)
          startingRef.current = false
        }
      }, 100) // Small delay to avoid timing conflicts
      
      return () => {
        clearTimeout(startTimeout)
      }
    } else if (!run && tourRef.current) {
      console.log('⏹️ Cancelling tour via run prop')
      startingRef.current = false
      tourRef.current.cancel()
    } else {
      console.log('⚠️ Cannot start tour - run:', run, 'tourExists:', !!tourRef.current, 'alreadyStarting:', startingRef.current)
    }
  }, [run])

  useEffect(() => {
    if (autoStart && !localStorage.getItem('bookiji_tour_completed') && tourRef.current) {
      console.log('🔄 Starting tour via autoStart')
      tourRef.current.start()
    }
  }, [autoStart])

  return null
} 