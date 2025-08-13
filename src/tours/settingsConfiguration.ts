import Shepherd from 'shepherd.js';

export const settingsConfigurationTourId = 'settings-configuration';

export const settingsConfigurationSteps: (Shepherd.Step.StepOptions & { helpArticleSlug?: string })[] = [
  {
    id: 'welcome',
    text: 'Configure your account settings',
    helpArticleSlug: 'support-options',
    buttons: [{ text: 'Next', action: () => Shepherd.activeTour?.next() }]
  },
  {
    id: 'profile-info',
    text: 'Update your profile information here.',
    attachTo: { element: '[data-tour="profile-info"]', on: 'top' },
    helpArticleSlug: 'support-options',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'preferences',
    text: 'Set your preferences using these options.',
    attachTo: { element: '[data-tour="preferences"]', on: 'top' },
    helpArticleSlug: 'languages-currency',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'notifications',
    text: 'Manage notification settings here.',
    attachTo: { element: '[data-tour="notifications"]', on: 'top' },
    helpArticleSlug: 'support-options',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'security',
    text: 'Adjust your security options.',
    attachTo: { element: '[data-tour="security"]', on: 'top' },
    helpArticleSlug: 'privacy-radius',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Done', action: () => Shepherd.activeTour?.complete() }
    ]
  }
];
