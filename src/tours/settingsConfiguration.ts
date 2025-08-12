import Shepherd from 'shepherd.js';

export const settingsConfigurationTourId = 'settings-configuration';

export const settingsConfigurationSteps: Shepherd.Step.StepOptions[] = [
  {
    id: 'welcome',
    text: 'Configure your account settings',
    buttons: [{ text: 'Next', action: () => Shepherd.activeTour?.next() }]
  },
  {
    id: 'profile-info',
    text: 'Update your profile information here.',
    attachTo: { element: '[data-tour="profile-info"]', on: 'top' },
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'preferences',
    text: 'Set your preferences using these options.',
    attachTo: { element: '[data-tour="preferences"]', on: 'top' },
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'notifications',
    text: 'Manage notification settings here.',
    attachTo: { element: '[data-tour="notifications"]', on: 'top' },
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'security',
    text: 'Adjust your security options.',
    attachTo: { element: '[data-tour="security"]', on: 'top' },
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Done', action: () => Shepherd.activeTour?.complete() }
    ]
  }
];
