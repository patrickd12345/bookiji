import Shepherd from 'shepherd.js'

export const vendorDashboardTourId = 'vendor-dashboard'
export const customerDashboardTourId = 'customer-dashboard'

interface TourStep {
  id: string
  text: string
  helpArticleSlug?: string
  attachTo?: { element: string; on: string }
  buttons?: Array<{ text: string; action: () => void }>
}

export const vendorDashboardSteps: TourStep[] = [
  {
    id: 'welcome',
    text: 'Welcome to your professional dashboard!',
    helpArticleSlug: 'vendor-dashboard',
    buttons: [{ text: 'Next', action: () => Shepherd.activeTour?.next() }]
  },
  {
    id: 'bookings-overview',
    text: 'View and manage all your bookings here.',
    attachTo: { element: '[data-tour="bookings"]', on: 'bottom' },
    helpArticleSlug: 'manage-bookings',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'calendar',
    text: 'Set your availability and manage your schedule.',
    attachTo: { element: '[data-tour="calendar"]', on: 'top' },
    helpArticleSlug: 'calendar-management',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'earnings',
    text: 'Track your earnings and payment history.',
    attachTo: { element: '[data-tour="earnings"]', on: 'left' },
    helpArticleSlug: 'earnings-tracking',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Done', action: () => Shepherd.activeTour?.complete() }
    ]
  }
]

export const customerDashboardSteps: TourStep[] = [
  {
    id: 'welcome',
    text: 'Welcome to your customer dashboard!',
    helpArticleSlug: 'customer-dashboard',
    buttons: [{ text: 'Next', action: () => Shepherd.activeTour?.next() }]
  },
  {
    id: 'bookings',
    text: 'View and manage all your upcoming bookings.',
    attachTo: { element: '[data-tour="bookings"]', on: 'bottom' },
    helpArticleSlug: 'manage-bookings',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'search',
    text: 'Find new services and providers in your area.',
    attachTo: { element: '[data-tour="search"]', on: 'top' },
    helpArticleSlug: 'search-providers',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'favorites',
    text: 'Save your favorite providers for quick access.',
    attachTo: { element: '[data-tour="favorites"]', on: 'left' },
    helpArticleSlug: 'favorite-providers',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Done', action: () => Shepherd.activeTour?.complete() }
    ]
  }
]
