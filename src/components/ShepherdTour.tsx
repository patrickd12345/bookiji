'use client'

import { useEffect, useRef, useCallback } from 'react'
import 'shepherd.js/dist/css/shepherd.css'

let globalTourInitialized = false

const log = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'test') console.log(...args)
}

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
  const startingRef = useRef(false)

  const cleanupTour = useCallback(() => {
    if (!tourRef.current) return

    log('Cleaning up existing tour')
    try {
      if (run && tourRef.current.isActive && tourRef.current.isActive()) {
        log('Skipping cleanup - tour is currently active')
        return
      }

      tourRef.current.complete()
      tourRef.current = null
      startingRef.current = false
    } catch (error) {
      log('Error during tour cleanup:', error)
      startingRef.current = false
    }
  }, [run])

  useEffect(() => {
    log('Initializing Shepherd tour with steps:', steps.length)

    if (globalTourInitialized && tourRef.current) {
      log('Skipping initialization - tour already initialized globally')
      return
    }

    if (tourRef.current && !run) {
      log('Skipping initialization - tour already exists and not running')
      return
    }

    cleanupTour()

    import('shepherd.js')
      .then((ShepherdModule) => {
        const Shepherd = ShepherdModule.default
        shepherdRef.current = Shepherd
        log('Shepherd loaded')

        if (Shepherd.activeTour) {
          log('Destroying existing global tour')
          Shepherd.activeTour.complete()
        }

        const tour = new Shepherd.Tour({
          useModalOverlay: true,
          defaultStepOptions: {
            classes: 'shepherd-theme-custom',
            scrollTo: { behavior: 'smooth', block: 'center' },
            cancelIcon: { enabled: true },
            modalOverlayOpeningPadding: 10,
            modalOverlayOpeningRadius: 8,
          }
        })

        log('Tour instance created')

        steps.forEach((step, index) => {
          const isLast = index === steps.length - 1
          const isFirst = index === 0

          const stepConfig: Record<string, unknown> = {
            id: step.id,
            title: step.title,
            text: step.content,
            buttons: [
              ...(isFirst
                ? []
                : [
                    {
                      text: 'Previous',
                      classes: 'shepherd-button-secondary',
                      action() {
                        log('Previous button clicked')
                        tour.back()
                      }
                    }
                  ]),
              {
                text: 'Skip',
                classes: 'shepherd-button-secondary',
                action: () => {
                  log('Skip button clicked')
                  tour.cancel()
                  onSkip?.()
                }
              },
              {
                text: isLast ? 'Finish' : 'Next',
                classes: 'shepherd-button-primary',
                action() {
                  log('Next/Finish button clicked', { isLast })
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
                log('Showing step', { id: step.id, target: step.target })
                const element = document.querySelector(step.target)
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
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

          tour.addStep(stepConfig)
        })

        tour.on('complete', () => {
          log('Tour completed')
          localStorage.setItem('bookiji_tour_completed', 'true')
          startingRef.current = false
          tourRef.current = null
          onComplete?.()
        })

        tour.on('cancel', () => {
          log('Tour cancelled')
          startingRef.current = false
          tourRef.current = null
          onSkip?.()
        })

        tour.on('start', () => {
          log('Tour started')
          startingRef.current = false
        })

        tourRef.current = tour
        log('Tour setup complete')
        globalTourInitialized = true

        if (run) {
          log('Starting tour immediately (run was already true)')
          tour.start()
        }
      })
      .catch((error) => {
        console.error('Failed to load Shepherd:', error)
      })

    return () => {
      cleanupTour()
    }
  }, [steps, onComplete, onSkip, cleanupTour, run])

  useEffect(() => {
    log('Run effect triggered', { run, hasTour: !!tourRef.current, starting: startingRef.current })

    if (run && tourRef.current && !startingRef.current) {
      startingRef.current = true
      log('Setting starting flag')

      const startTimeout = setTimeout(() => {
        try {
          if (tourRef.current && run) {
            log('Starting tour after delay via run prop')
            tourRef.current.start()
            log('Tour start command executed successfully')
          } else {
            log('Tour conditions changed during delay, aborting start')
            startingRef.current = false
          }
        } catch (error) {
          console.error('Error starting tour:', error)
          startingRef.current = false
        }
      }, 100)

      return () => clearTimeout(startTimeout)
    }

    if (!run && tourRef.current) {
      log('Cancelling tour via run prop')
      startingRef.current = false
      tourRef.current.cancel()
    }
  }, [run])

  useEffect(() => {
    if (autoStart && !localStorage.getItem('bookiji_tour_completed') && tourRef.current) {
      log('Starting tour via autoStart')
      tourRef.current.start()
    }
  }, [autoStart])

  return null
}

