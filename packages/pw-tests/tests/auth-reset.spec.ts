import { test, expect } from '@playwright/test';

test('should submit reset form and show confirmation', async ({ page }) => {
  // Set a longer timeout for this test due to potential network delays
  test.setTimeout(60000);
  // Step 1: Navigate to the forgot password page
  await page.goto('http://localhost:3000/forgot-password');
  await page.waitForLoadState('networkidle');

  // Verify that the page loaded correctly
  await expect(page).toHaveTitle(/Forgot Password | Bookiji/);
  await expect(page.locator('h1')).toContainText('Reset your password');

  // Step 2: Fill in the email field with test email
  await page.fill('input[name="email"]', 'pilotmontreal@gmail.com');

  // Step 3: Submit the form
  await page.click('button[type="submit"]');

  // Step 4: Expect a confirmation message in the UI
  await expect(page.locator('.text-green-600, .bg-green-50, .success-message')).toContainText(/Check your email for the confirmation link/);
});

test('should navigate to update password page with token', async ({ page }) => {
  // Set a longer timeout for this test due to potential network delays
  test.setTimeout(60000);
  // Step 1: Simulate clicking the reset link by navigating to update-password with a fake token
  await page.goto('http://localhost:3000/update-password#access_token=fake_token&refresh_token=fake_refresh_token');
  await page.waitForLoadState('networkidle');

  // Step 2: Verify that the page renders properly
  await expect(page).toHaveTitle(/Update Password | Bookiji/);
  await expect(page.locator('h1')).toContainText('Update your password');
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
});

test('should update password and redirect to dashboard', async ({ page }) => {
  // Set a longer timeout for this test due to potential network delays
  test.setTimeout(60000);
  // Step 1: Navigate to update-password with a fake token
  await page.goto('http://localhost:3000/update-password#access_token=fake_token&refresh_token=fake_refresh_token');
  await page.waitForLoadState('networkidle');

  // Step 2: Fill in the new password and confirm it
  await page.fill('input[name="password"]', 'NewStrongPassword123!');
  await page.fill('input[name="confirmPassword"]', 'NewStrongPassword123!');

  // Step 3: Submit the form
  await page.click('button[type="submit"]');

  // Step 4: Expect a redirect to dashboard
  await page.waitForURL('**/dashboard');
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator('h1, .welcome-message, .text-xl')).toContainText(/Welcome/);
});

test('should not show Realtime connection closed popup on dashboard', async ({ page }) => {
  // Set a longer timeout for this test due to potential network delays
  test.setTimeout(60000);
  // Step 1: Navigate to dashboard after password update simulation
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForLoadState('networkidle');

  // Step 2: Wait for a short period to allow any potential popups to appear
  await page.waitForTimeout(3000);

  // Step 3: Verify that no intrusive 'Realtime connection closed' popup or alert appears
  await expect(page.locator('.alert, .popup, .notification, .error-message, .toast')).not.toContainText(/Realtime connection closed|Reconnecting/);
});
