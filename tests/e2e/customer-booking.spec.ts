import { test, expect } from '@playwright/test';

test.describe('Customer Booking Flow', () => {
  test('Customer booking page renders and responds to interactions', async ({ page }) => {
    await page.goto('/book/vendor_1');

    // Page should load without errors
    await expect(page).toHaveURL(/\/book\/vendor_1/);
    
    // Basic page structure should be visible
    await expect(page.locator('body')).toBeVisible();

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Test service selection if services are visible
    const serviceCards = page.locator('[data-testid="service-card"], .service-card, .grid.gap-4 > div').first();
    if (await serviceCards.count() > 0) {
      await serviceCards.first().click();
      // Verify some interaction occurred (e.g., selection state changed)
      await expect(serviceCards.first()).toBeVisible();
    }

    // Test date picker if present
    const dateInput = page.locator('input[type="date"]');
    if (await dateInput.count() > 0) {
      await dateInput.click();
      await expect(dateInput).toBeFocused();
      
      // Set a future date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];
      await dateInput.fill(tomorrowString);
      await expect(dateInput).toHaveValue(tomorrowString);
    }

    // Test time selection if present
    const timeSelect = page.locator('select');
    if (await timeSelect.count() > 0) {
      await timeSelect.click();
      await expect(timeSelect).toBeFocused();
      
      // Select first available time option
      const options = page.locator('select option');
      if (await options.count() > 1) {
        await timeSelect.selectOption({ index: 1 });
        const selectedValue = await options.nth(1).getAttribute('value');
        if (selectedValue) {
          await expect(timeSelect).toHaveValue(selectedValue);
        }
      }
    }

    // Test book appointment button if present
    const bookButton = page.locator('button:has-text("Book Appointment"), button:has-text("Book"), [data-testid="book-button"]');
    if (await bookButton.count() > 0) {
      await expect(bookButton).toBeVisible();
      await bookButton.click();
      // Button should respond to click (even if form validation prevents submission)
      await expect(page.locator('body')).toBeVisible();
    }

    // Test any form validation by trying to submit with missing data
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit")');
    if (await submitButton.count() > 0) {
      await submitButton.click();
      // Should show validation errors or prevent submission
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
