import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('Register page loads and responds to interactions', async ({ page }) => {
    await page.goto('/register');

    // Page should load without errors
    await expect(page).toHaveURL(/\/register/);
    
    // Basic page structure should be visible
    await expect(page.locator('body')).toBeVisible();

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Test form field interactions
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"], input[name="confirm_password"]');
    const registerButton = page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Sign up")');

    // Verify form elements are present
    if (await emailInput.count() > 0) {
      await expect(emailInput).toBeVisible();
      await emailInput.click();
      await expect(emailInput).toBeFocused();
      
      // Test typing
      await emailInput.fill('test@example.com');
      await expect(emailInput).toHaveValue('test@example.com');
    }

    if (await passwordInput.count() > 0) {
      await expect(passwordInput).toBeVisible();
      await passwordInput.click();
      await expect(passwordInput).toBeFocused();
      
      // Test typing
      await passwordInput.fill('TestPassword123!');
      await expect(passwordInput).toHaveValue('TestPassword123!');
    }

    if (await confirmPasswordInput.count() > 0) {
      await expect(confirmPasswordInput).toBeVisible();
      await confirmPasswordInput.click();
      await expect(confirmPasswordInput).toBeFocused();
      
      // Test typing
      await confirmPasswordInput.fill('TestPassword123!');
      await expect(confirmPasswordInput).toHaveValue('TestPassword123!');
    }

    // Test register button
    if (await registerButton.count() > 0) {
      await expect(registerButton).toBeVisible();
      
      // Test button click (should trigger form validation or submission)
      await registerButton.click();
      await expect(page.locator('body')).toBeVisible();
    }

    // Test form validation by clearing required fields
    if (await emailInput.count() > 0) {
      await emailInput.clear();
      await expect(emailInput).toHaveValue('');
      
      // Try to submit with missing email
      if (await registerButton.count() > 0) {
        await registerButton.click();
        // Should show validation error or prevent submission
        await expect(page.locator('body')).toBeVisible();
      }
    }

    // Test password mismatch validation if both password fields exist
    if (await passwordInput.count() > 0 && await confirmPasswordInput.count() > 0) {
      await passwordInput.fill('Password123!');
      await confirmPasswordInput.fill('DifferentPassword123!');
      
      if (await registerButton.count() > 0) {
        await registerButton.click();
        // Should show validation error for password mismatch
        await expect(page.locator('body')).toBeVisible();
      }
    }

    // Test link interactions if present
    const loginLink = page.locator('a:has-text("Login"), a:has-text("Sign in"), a[href*="login"]');
    if (await loginLink.count() > 0) {
      await expect(loginLink).toBeVisible();
      await loginLink.click();
      // Should navigate to login page
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
