'use client'

import { useEffect, useState, useCallback } from 'react'

interface TourStep {
  target: string
  title: string
  text: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  buttons?: Array<{
    text: string
    action: () => void
    classes?: string
  }>
}

interface GuidedTourManagerProps {
  type: 'customer' | 'vendor'
  onComplete?: () => void
  onSkip?: () => void
}

interface Tour {
  start: () => void
  next: () => void
  back: () => void
  complete: () => void
  on: (event: string, handler: () => void) => void
}

export default function GuidedTourManager({ type, onComplete, onSkip }: GuidedTourManagerProps) {
  const [isClient, setIsClient] = useState(false)
  const [tour, setTour] = useState<Tour | null>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const initializeTour = useCallback(async () => {
    if (!isClient) return

    try {
      const Shepherd = await import('shepherd.js')
      
      const newTour = new Shepherd.default.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          classes: 'bookiji-tour-step',
          scrollTo: true,
          modalOverlayOpeningPadding: 4
        }
      })

      const customerTourSteps: TourStep[] = [
        {
          target: 'body',
          title: 'Welcome to Your Bookiji Dashboard!',
          text: 'Let us show you around your personal booking hub. This tour will help you discover all the features available to make booking services easier than ever.',
          placement: 'bottom'
        },
        {
          target: '[data-tour="credit-balance"]',
          title: 'Your Credit Balance',
          text: 'Keep track of your Bookiji Credits here. Credits make booking faster and earn you bonuses. Click the balance to purchase more credits or view your transaction history.',
          placement: 'bottom'
        },
        {
          target: '[data-tour="upcoming-bookings"]',
          title: 'Upcoming Bookings',
          text: 'See all your confirmed appointments at a glance. Get reminders, reschedule if needed, or cancel with our flexible policies. Never miss an appointment again!',
          placement: 'top'
        },
        {
          target: '[data-tour="favorites"]',
          title: 'Your Favorites',
          text: 'Save your favorite providers for quick rebooking. Build relationships with trusted service providers and enjoy faster booking experiences.',
          placement: 'top'
        },
        {
          target: '[data-tour="booking-history"]',
          title: 'Booking History',
          text: 'Review your bookings and next steps. Bookiji exits after booking handoff.',
          placement: 'top'
        },
        {
          target: '[data-tour="profile-settings"]',
          title: 'Profile Settings',
          text: 'Manage your personal information, payment methods, and notification preferences. Keep your profile updated for the best booking experience.',
          placement: 'left'
        }
      ]

      const vendorTourSteps: TourStep[] = [
        {
          target: 'body',
          title: 'Welcome to Your Provider Dashboard!',
          text: 'Your business command center is here! This tour will show you how to manage bookings, track performance, and grow your business with Bookiji.',
          placement: 'bottom'
        },
        {
          target: '[data-tour="revenue-overview"]',
          title: 'Revenue Overview',
          text: 'Monitor your earnings in real-time. See total revenue and booking volume at a glance.',
          placement: 'bottom'
        },
        {
          target: '[data-tour="recent-bookings"]',
          title: 'Recent Bookings',
          text: 'Manage all your appointments here. Accept new bookings, confirm details, and communicate with customers. Our commitment system ensures serious customers only.',
          placement: 'top'
        },
        {
          target: '[data-tour="calendar-tab"]',
          title: 'Calendar Management',
          text: 'Keep your availability updated to maximize bookings. Connect your existing calendar or use our built-in system. Set working hours, block time, and manage multiple services.',
          placement: 'bottom'
        },
        {
          target: '[data-tour="analytics-tab"]',
          title: 'Performance Analytics',
          text: 'Understand your business with insights. Track booking volume and revenue trends.',
          placement: 'bottom'
        }
      ]

      const steps = type === 'customer' ? customerTourSteps : vendorTourSteps

      steps.forEach((step, index) => {
        const isLast = index === steps.length - 1
        const isFirst = index === 0

        // Check if target element exists before attaching
        const targetElement = typeof step.target === 'string' 
          ? document.querySelector(step.target)
          : step.target

        // Skip step if element doesn't exist (except for body)
        if (!targetElement && step.target !== 'body') {
          console.warn(`Tour step "${step.title}" skipped: element "${step.target}" not found`)
          return
        }

        newTour.addStep({
          title: step.title,
          text: step.text,
          attachTo: targetElement ? {
            element: step.target,
            on: step.placement || 'bottom'
          } : undefined,
          buttons: [
            ...(!isFirst ? [{
              text: 'Back',
              action: () => newTour.back(),
              classes: 'shepherd-button-secondary'
            }] : []),
            {
              text: 'Skip Tour',
              action: () => {
                newTour.complete()
                onSkip?.()
              },
              classes: 'shepherd-button-skip'
            },
            {
              text: isLast ? 'Finish' : 'Next',
              action: () => {
                if (isLast) {
                  newTour.complete()
                  onComplete?.()
                } else {
                  newTour.next()
                }
              },
              classes: 'shepherd-button-primary'
            }
          ]
        })
      })

      newTour.on('complete', () => {
        onComplete?.()
      })

      newTour.on('cancel', () => {
        onSkip?.()
      })

      setTour(newTour)
      return newTour
    } catch (error) {
      console.error('Failed to initialize tour:', error)
    }
  }, [isClient, type, onComplete, onSkip])

  // helper to attach global shortcuts (advance on Enter/Space or overlay click)
  const attachShortcuts = useCallback((activeTour: Tour) => {
    const keyHandler = (e: KeyboardEvent) => {
      if (['Enter', ' '].includes(e.key)) {
        e.preventDefault()
        try {
          activeTour.next()
        } catch {}
      }
    }

    const clickHandler = () => {
      try {
        activeTour.next()
      } catch {}
    }

    window.addEventListener('keydown', keyHandler)

    const overlay = document.querySelector('.shepherd-modal-overlay-container')
    overlay?.addEventListener('click', clickHandler)

    // Clean-up when tour ends
    const detach = () => {
      window.removeEventListener('keydown', keyHandler)
      overlay?.removeEventListener('click', clickHandler)
    }

    activeTour.on('complete', detach)
    activeTour.on('cancel', detach)
  }, [])

  const startTour = useCallback(async () => {
    let currentTour = tour
    if (!currentTour) {
      const newTour = await initializeTour()
      if (newTour) {
        currentTour = newTour
      }
    }
    
    if (currentTour) {
      currentTour.start()
      attachShortcuts(currentTour)
    }
  }, [tour, initializeTour, attachShortcuts])

  useEffect(() => {
    if (isClient) {
      initializeTour()

      // Listen for global event to start the tour (dispatched by <TourButton />)
      const handler = () => {
        startTour()
      }
      window.addEventListener('start-bookiji-tour', handler as EventListener)

      return () => {
        window.removeEventListener('start-bookiji-tour', handler as EventListener)
        if (tour) {
          tour.complete()
        }
      }
    }
  }, [isClient, type, initializeTour, startTour, tour])

  return (
    <>
      {/* Tour Styles */}
      <style jsx global>{`
        .bookiji-tour-step {
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          max-width: 400px;
        }

        .bookiji-tour-step .shepherd-header {
          padding: 16px 20px 0;
        }

        .bookiji-tour-step .shepherd-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .bookiji-tour-step .shepherd-text {
          padding: 12px 20px;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .bookiji-tour-step .shepherd-footer {
          padding: 0 20px 16px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .bookiji-tour-step .shepherd-button {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .bookiji-tour-step .shepherd-button-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: white;
        }

        .bookiji-tour-step .shepherd-button-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .bookiji-tour-step .shepherd-button-secondary {
          background: #f3f4f6;
          color: #6b7280;
        }

        .bookiji-tour-step .shepherd-button-secondary:hover {
          background: #e5e7eb;
        }

        .bookiji-tour-step .shepherd-button-skip {
          background: transparent;
          color: #9ca3af;
        }

        .bookiji-tour-step .shepherd-button-skip:hover {
          color: #6b7280;
        }

        .shepherd-modal-overlay-container {
          background: rgba(0, 0, 0, 0.5);
        }

        .shepherd-target-highlight {
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          border-radius: 4px;
        }
      `}</style>

      {/* Tour Trigger Button */}
      <button
        onClick={startTour}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50"
        title={`Start ${type === 'customer' ? 'Customer' : 'Provider'} Tour`}
        suppressHydrationWarning
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Tour overlay will be rendered here by Shepherd.js */}
    </>
  )
} 