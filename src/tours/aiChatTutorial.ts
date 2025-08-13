import Shepherd from 'shepherd.js';

export const aiChatTutorialTourId = 'ai-chat-tutorial';

export const aiChatTutorialSteps: (Shepherd.Step.StepOptions & { helpArticleSlug?: string })[] = [
  {
    id: 'welcome',
    text: 'Learn how to use AI-powered booking',
    helpArticleSlug: 'support-options',
    buttons: [
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'chat-input',
    text: 'Type your questions or requests here.',
    attachTo: { element: '#aiChatInput', on: 'top' },
    helpArticleSlug: 'how-booking-works',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'example-queries',
    text: 'Here are some example queries you can try.',
    attachTo: { element: '[data-tour="example-queries"]', on: 'top' },
    helpArticleSlug: 'how-booking-works',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'response-display',
    text: 'AI responses will appear in this area.',
    attachTo: { element: '[data-tour="response-display"]', on: 'top' },
    helpArticleSlug: 'how-booking-works',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'booking-integration',
    text: 'Use this button to start booking from your conversation.',
    attachTo: { element: '[data-tour="booking-button"]', on: 'bottom' },
    helpArticleSlug: 'how-booking-works',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Next', action: () => Shepherd.activeTour?.next() }
    ]
  },
  {
    id: 'settings',
    text: 'Adjust AI settings and preferences here.',
    attachTo: { element: '[data-tour="settings"]', on: 'left' },
    helpArticleSlug: 'support-options',
    buttons: [
      { text: 'Back', action: () => Shepherd.activeTour?.back() },
      { text: 'Done', action: () => Shepherd.activeTour?.complete() }
    ]
  }
];
