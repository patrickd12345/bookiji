import Shepherd from 'shepherd.js';

export const vendorOnboardingTourId = 'vendor-onboarding';

export const vendorOnboardingSteps: Shepherd.Step.StepOptions[] = [
  {
    id: 'welcome',
    text: 'Welcome! This short tour will guide you through the provider registration form.',
    buttons: [
      {
        text: 'Next',
        action: () => Shepherd.activeTour?.next()
      }
    ]
  },
  {
    id: 'business-name',
    text: 'Enter your business name here.',
    attachTo: { element: '#businessName', on: 'bottom' },
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'service-type',
    text: 'Select the service type that best fits your business.',
    attachTo: { element: '#serviceType', on: 'bottom' },
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'submit',
    text: 'When you\'re ready, submit your application here.',
    attachTo: { element: '#submitApplication', on: 'top' },
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Done', action: () => Shepherd.activeTour?.complete() }
    ]
  }
];
