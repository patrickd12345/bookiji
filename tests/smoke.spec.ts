import { test, expect } from '@playwright/test';

test.describe('Bookiji Smoke Tests', () => {
  test('homepage loads without cancel/reschedule buttons', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads
    await expect(page).toHaveTitle(/Bookiji/);
    
    // Verify no cancel/reschedule buttons exist (phone-only policy)
    await expect(page.getByRole('button', { name: /cancel/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /reschedule/i })).toHaveCount(0);
    
    // Verify the page loads successfully by checking for content
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('FAQ page shows phone-only cancellation policy', async ({ page }) => {
    await page.goto('/faq');
    
    // Verify the phone-only cancellation policy is displayed
    await expect(page.getByText(/Bookiji does not provide in-app cancellations/)).toBeVisible();
    await expect(page.getByText(/call the other party using the phone number/)).toBeVisible();
  });

  test('health endpoint responds', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('phone-only cancellation API returns 410', async ({ page }) => {
    const response = await page.request.post('/api/bookings/cancel', {
      data: { bookingId: 'test', userId: 'test' }
    });
    
    expect(response.status()).toBe(410);
    
    const data = await response.json();
    expect(data.error).toBe('CANCELLATION_DISABLED');
    expect(data.message).toContain('Call the other party using the phone number');
  });
});
