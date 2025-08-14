import Shepherd from 'shepherd.js'

export const vendorOnboardingTourId = 'vendor-onboarding'

interface TourStep {
  id: string
  text: string
  helpArticleSlug?: string
  attachTo?: { element: string; on: string }
  buttons?: Array<{ text: string; action: () => void }>
}

export const vendorOnboardingSteps: TourStep[] = [
  {
    id: 'welcome',
    text: 'Welcome to Bookiji! Let\'s get you set up.',
    helpArticleSlug: 'provider-onboarding',
    buttons: [
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'business-info',
    text: 'Fill in your business information here.',
    attachTo: { element: '[data-tour="business-info"]', on: 'top' },
    helpArticleSlug: 'business-setup',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'services',
    text: 'Add the services you offer.',
    attachTo: { element: '[data-tour="services"]', on: 'top' },
    helpArticleSlug: 'service-setup',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Done', action: () => Shepherd.activeTour?.complete() }
    ]
  }
]
