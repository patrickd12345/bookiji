import Shepherd from 'shepherd.js';

export const customerBookingTourId = 'customer-booking';

export const customerBookingSteps: (Shepherd.Step.StepOptions & { helpArticleSlug?: string })[] = [
  {
    id: 'welcome',
    text: "Let's book your service step-by-step",
    helpArticleSlug: 'how-booking-works',
    buttons: [
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'service-search',
    text: 'Start by searching for a service using our AI assistant.',
    attachTo: { element: '#aiChatInput', on: 'bottom' },
    helpArticleSlug: 'how-booking-works',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'date-selection',
    text: 'Pick a date for your appointment.',
    attachTo: { element: '[data-tour="date-picker"]', on: 'top' },
    helpArticleSlug: 'reschedule-cancel',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'time-selection',
    text: 'Choose a time that works for you.',
    attachTo: { element: '[data-tour="time-picker"]', on: 'top' },
    helpArticleSlug: 'reschedule-cancel',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'provider-selection',
    text: 'Review the provider details here.',
    attachTo: { element: '[data-tour="provider-selection"]', on: 'top' },
    helpArticleSlug: 'provider-onboarding',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'payment',
    text: 'Select your preferred payment method.',
    attachTo: { element: '[data-tour="payment-form"]', on: 'top' },
     helpArticleSlug: 'the-1-commitment-fee',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'confirmation',
    text: 'Submit your booking when everything looks good.',
    attachTo: { element: '[data-tour="submit-booking"]', on: 'top' },
    helpArticleSlug: 'refunds-no-shows',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Done', action: () => Shepherd.activeTour?.complete() }
    ]
  }
];
