import { test, expect } from '@playwright/test';

test('calendar endpoints accessible', async ({ page, context }) => {
  // Test the ICS endpoint directly
  const icsResponse = await context.request.get('/api/calendar.ics?bookingId=test123');
  expect(icsResponse.ok()).toBeTruthy();
  expect(icsResponse.headers()['content-type']).toMatch(/text\/calendar/);
  
  // Verify the ICS content looks valid
  const icsContent = await icsResponse.text();
  expect(icsContent).toContain('BEGIN:VCALENDAR');
  expect(icsContent).toContain('END:VCALENDAR');
  expect(icsContent).toContain('test123@bookiji.com');
});
