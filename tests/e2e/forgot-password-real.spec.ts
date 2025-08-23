import { test, expect } from '@playwright/test';

test.describe('Forgot Password - Real End-to-End Test', () => {
  test('should actually submit forgot password form and call Supabase', async ({ page }) => {
    // Navigate to the forgot password page
    await page.goto('http://localhost:3000/forgot-password');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Verify the page loaded correctly
    await expect(page.locator('h2')).toContainText('Reset your password');
    
    // Fill in the email field
    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill('test@example.com');
    
    // Click the submit button
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Wait for the form submission to complete
    await page.waitForTimeout(2000);
    
    // Check for success message - look for the specific heading
    const successHeading = page.locator('h2:has-text("Check your email")');
    await expect(successHeading).toBeVisible();
    
    // Also check for the success description
    const successDescription = page.locator('text=We\'ve sent you a link to reset your password');
    await expect(successDescription).toBeVisible();
    
    console.log('✅ SUCCESS: Password reset email sent successfully!');
  });

  test('should show loading state while processing', async ({ page }) => {
    await page.goto('http://localhost:3000/forgot-password');
    await page.waitForLoadState('networkidle');
    
    // Fill in the email field
    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill('test@example.com');
    
    // Click submit and immediately check for loading state
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Should show loading state
    await expect(page.locator('text=Sending...')).toBeVisible();
    
    // Wait for completion
    await page.waitForTimeout(3000);
    
    // Should no longer show loading state
    await expect(page.locator('text=Sending...')).not.toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('http://localhost:3000/forgot-password');
    await page.waitForLoadState('networkidle');
    
    // Try to submit with invalid email
    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill('invalid-email');
    
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Should show validation error or prevent submission
    await page.waitForTimeout(1000);
    
    // Check if form is still on the same page (validation prevented submission)
    await expect(page.locator('h2')).toContainText('Reset your password');
  });
});
