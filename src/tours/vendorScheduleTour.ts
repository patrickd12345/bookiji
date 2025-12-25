import { Tour, TourStep } from './TourProvider'

export const vendorScheduleTour: Tour = {
  id: 'vendor-schedule',
  name: 'Vendor Schedule Setup',
  steps: [
    {
      id: 'availability-mode',
      target: '[name="availabilityMode"]',
      title: 'Choose Availability Mode',
      content: 'Select how you want to manage your availability. Subtractive mode starts with your working hours and blocks busy times. Additive mode requires you to mark specific times as available.',
      placement: 'bottom',
    },
    {
      id: 'google-calendar',
      target: '[data-google-calendar-connection]',
      title: 'Connect Google Calendar',
      content: 'Link your Google Calendar to automatically sync your busy times. This ensures customers only see times when you\'re actually available.',
      placement: 'bottom',
    },
    {
      id: 'schedule-editor',
      target: '[data-schedule-editor]',
      title: 'Set Your Weekly Hours',
      content: 'Define your standard working hours for each day of the week. You can add multiple time ranges per day if needed.',
      placement: 'top',
    },
    {
      id: 'save-button',
      target: 'button[onclick*="handleSaveAndGenerate"]',
      title: 'Save and Generate Slots',
      content: 'Click this button to save your schedule and automatically generate available booking slots for the next 30 days.',
      placement: 'top',
    },
  ],
}
