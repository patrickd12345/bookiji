
import { test, expect } from '@playwright/test';

test('verify vendor onboarding wizard', async ({ page }) => {
  // Mock the API calls
  await page.route('/api/vendor/onboarding/draft', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          step: 'business_info',
          data: {}
        }
      });
    } else if (route.request().method() === 'POST') {
      await route.fulfill({ json: { success: true } });
    }
  });

  // Navigate to the onboarding page
  // Note: We need a running server. If not running, we might need to rely on unit tests or start it.
  // Assuming 'npm run dev' is running on 3000
  await page.goto('http://localhost:3000/vendor/onboarding');

  // Check if step 1 is visible
  await expect(page.getByText('Step 1: Business Information')).toBeVisible();
  await expect(page.getByLabel('Business Name *')).toBeVisible();

  // Fill out the form
  await page.getByLabel('Business Name *').fill('My Test Business');
  await page.getByLabel('Contact Name *').fill('John Doe');
  await page.getByLabel('Email *').fill('john@example.com');

  // Take screenshot of Step 1
  await page.screenshot({ path: '/home/jules/verification/step1.png' });

  // Click Next
  await page.getByRole('button', { name: 'Next' }).click();

  // Check Step 2
  await expect(page.getByText('Step 2: Services & Specialties')).toBeVisible();
  await page.screenshot({ path: '/home/jules/verification/step2.png' });

});
