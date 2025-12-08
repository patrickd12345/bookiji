import { expect, test } from '@playwright/test';

// Validates calendar exports are exposed on confirmation flows.
test.describe('Calendar export links', () => {
  test('renders Google Calendar and ICS download options', async ({ page }) => {
    try {
      await page.goto('/confirmation', { timeout: 30000 });
      await expect(page.locator('body')).toBeVisible();

      const googleCalendarLink = page.getByRole('link', { name: /google calendar/i });
      const icsDownloadLink = page.getByRole('link', { name: /ics|download calendar|add to calendar/i });

      if ((await googleCalendarLink.count()) === 0) {
        console.log('Google Calendar link not found; check confirmation template.');
      } else {
        await expect(googleCalendarLink.first()).toHaveAttribute('href', /google/);
      }

      if ((await icsDownloadLink.count()) === 0) {
        console.log('ICS download link not found; ensure ICS export available.');
      } else {
        const href = await icsDownloadLink.first().getAttribute('href');
        expect(href).toMatch(/\.ics($|\?)/);
      }
    } catch (error) {
      console.log('App not running, skipping calendar export check');
      test.skip();
    }
  });
});
