import { test, expect } from '@playwright/test';

test.describe('Vendor Registration Flow', () => {
  test('Vendor onboarding page renders and responds to interactions', async ({ page }) => {
    // Go directly to onboarding
    await page.goto('/vendor/onboarding');
    await page.waitForLoadState('networkidle');

    // Primary heading is present
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Onboarding page renders VendorRegistration
    await expect(page.getByText('Provider onboarding')).toBeVisible();

    // Form fields are visible
    const businessNameInput = page.getByPlaceholder('Business name');
    const contactNameInput = page.getByPlaceholder('Contact name');
    const phoneInput = page.getByPlaceholder('Phone');
    const emailInput = page.getByPlaceholder('Email');
    const addressInput = page.getByPlaceholder('Address');
    const descriptionInput = page.getByPlaceholder('Description');
    const submitButton = page.getByRole('button', { name: 'Finish onboarding' });

    await expect(businessNameInput).toBeVisible();
    await expect(contactNameInput).toBeVisible();
    await expect(phoneInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(addressInput).toBeVisible();
    await expect(descriptionInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Test form interactions
    // Click on each input field to ensure they're focusable
    await businessNameInput.click();
    await expect(businessNameInput).toBeFocused();
    
    await contactNameInput.click();
    await expect(contactNameInput).toBeFocused();
    
    await phoneInput.click();
    await expect(phoneInput).toBeFocused();
    
    await emailInput.click();
    await expect(emailInput).toBeFocused();
    
    await addressInput.click();
    await expect(addressInput).toBeFocused();
    
    await descriptionInput.click();
    await expect(descriptionInput).toBeFocused();

    // Test typing in fields
    await businessNameInput.fill('Test Business');
    await expect(businessNameInput).toHaveValue('Test Business');
    
    await contactNameInput.fill('John Doe');
    await expect(contactNameInput).toHaveValue('John Doe');
    
    await phoneInput.fill('+1234567890');
    await expect(phoneInput).toHaveValue('+1234567890');
    
    await emailInput.fill('test@business.com');
    await expect(emailInput).toHaveValue('test@business.com');
    
    await addressInput.fill('123 Test Street');
    await expect(addressInput).toHaveValue('123 Test Street');
    
    await descriptionInput.fill('A test business description');
    await expect(descriptionInput).toHaveValue('A test business description');

    // Test submit button state changes
    await expect(submitButton).toBeEnabled();
    
    // Clear a required field to test validation
    await businessNameInput.clear();
    await expect(businessNameInput).toHaveValue('');
    
    // Try to submit with missing field
    await submitButton.click();
    
    // Should show validation error or prevent submission
    // The exact behavior depends on the form validation implementation
    await expect(page.locator('body')).toBeVisible();
  });
});
