import Shepherd from 'shepherd.js';

export const vendorDashboardTourId = 'vendor-dashboard';
export const customerDashboardTourId = 'customer-dashboard';

export const vendorDashboardSteps: (Shepherd.Step.StepOptions & { helpArticleSlug?: string })[] = [
  {
    id: 'welcome',
    text: 'Your business command center',
    helpArticleSlug: 'provider-onboarding',
    buttons: [{ text: 'Next', action: () => Shepherd.activeTour?.next() }]
  },
  {
    id: 'stats',
    text: 'Track your performance with these statistics.',
    attachTo: { element: '[data-tour="stats-cards"]', on: 'top' },
    helpArticleSlug: 'provider-onboarding',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'recent-bookings',
    text: 'Manage your recent bookings here.',
    attachTo: { element: '[data-tour="recent-bookings"]', on: 'top' },
    helpArticleSlug: 'reschedule-cancel',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'quick-actions',
    text: 'Access quick actions for common tasks.',
    attachTo: { element: '[data-tour="quick-actions"]', on: 'top' },
    helpArticleSlug: 'provider-onboarding',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'settings',
    text: 'Manage your account settings here.',
    attachTo: { element: '[data-tour="settings-menu"]', on: 'left' },
    helpArticleSlug: 'support-options',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Done', action: () => Shepherd.activeTour?.complete() }
    ]
  }
];

export const customerDashboardSteps: (Shepherd.Step.StepOptions & { helpArticleSlug?: string })[] = [
  {
    id: 'welcome',
    text: 'Your personal booking hub',
    helpArticleSlug: 'how-booking-works',
    buttons: [{ text: 'Next', action: () => Shepherd.activeTour?.next() }]
  },
  {
    id: 'upcoming-bookings',
    text: 'Check your upcoming bookings here.',
    attachTo: { element: '[data-tour="upcoming-bookings"]', on: 'top' },
    helpArticleSlug: 'reschedule-cancel',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'favorites',
    text: 'Your saved providers appear in this section.',
    attachTo: { element: '[data-tour="favorites"]', on: 'top' },
    helpArticleSlug: 'how-booking-works',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'history',
    text: 'View your booking history here.',
    attachTo: { element: '[data-tour="booking-history"]', on: 'top' },
    helpArticleSlug: 'how-booking-works',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'profile',
    text: 'Manage your profile settings.',
    attachTo: { element: '[data-tour="profile-settings"]', on: 'left' },
    helpArticleSlug: 'support-options',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Done', action: () => Shepherd.activeTour?.complete() }
    ]
  }
];
