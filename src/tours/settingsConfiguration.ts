import Shepherd from 'shepherd.js'

interface TourStep {
  id: string
  text: string
  helpArticleSlug?: string
  attachTo?: { element: string; on: string }
  buttons?: Array<{ text: string; action: () => void }>
}

export const settingsConfigurationTourId = 'settings-configuration';

export const settingsConfigurationSteps: TourStep[] = [
  {
    id: 'welcome',
    text: 'Configure your account settings.',
    helpArticleSlug: 'account-settings',
    buttons: [{ text: 'Next', action: () => Shepherd.activeTour?.next() }]
  },
  {
    id: 'profile',
    text: 'Update your profile information here.',
    attachTo: { element: '[data-tour="profile"]', on: 'top' },
    helpArticleSlug: 'profile-settings',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'notifications',
    text: 'Manage your notification preferences.',
    attachTo: { element: '[data-tour="notifications"]', on: 'top' },
    helpArticleSlug: 'notification-settings',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'privacy',
    text: 'Control your privacy and data settings.',
    attachTo: { element: '[data-tour="privacy"]', on: 'left' },
    helpArticleSlug: 'privacy-settings',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Done', action: () => Shepherd.activeTour?.complete() }
    ]
  }
]
