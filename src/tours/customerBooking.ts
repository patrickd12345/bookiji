import Shepherd from 'shepherd.js'

export const customerBookingTourId = 'customer-booking'

interface TourStep {
  id: string
  text: string
  helpArticleSlug?: string
  attachTo?: { element: string; on: string }
  buttons?: Array<{ text: string; action: () => void }>
}

export const customerBookingSteps: TourStep[] = [
  {
    id: 'welcome',
    text: 'Learn how to book services on Bookiji.',
    helpArticleSlug: 'how-booking-works',
    buttons: [{ text: 'Next', action: () => Shepherd.activeTour?.next() }]
  },
  {
    id: 'search',
    text: 'Search for services and providers in your area.',
    attachTo: { element: '[data-tour="search"]', on: 'top' },
    helpArticleSlug: 'search-providers',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'provider-selection',
    text: 'Choose your preferred provider from the list.',
    attachTo: { element: '[data-tour="provider-list"]', on: 'top' },
    helpArticleSlug: 'choose-provider',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'service-selection',
    text: 'Select the specific service you need.',
    attachTo: { element: '[data-tour="service-options"]', on: 'top' },
    helpArticleSlug: 'select-service',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'date-time',
    text: 'Pick your preferred date and time slot.',
    attachTo: { element: '[data-tour="calendar"]', on: 'top' },
    helpArticleSlug: 'select-time',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'confirmation',
    text: 'Review and confirm your booking details.',
    attachTo: { element: '[data-tour="confirmation"]', on: 'top' },
    helpArticleSlug: 'confirm-booking',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Done', action: () => Shepherd.activeTour?.complete() }
    ]
  }
]
