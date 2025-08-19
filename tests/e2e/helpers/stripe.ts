import { Page } from '@playwright/test';

/**
 * Fills in a Stripe card form in an iframe
 * This is a common pattern for testing Stripe payment flows
 */
export async function fillStripeCard(page: Page) {
  // Wait for Stripe iframe to be present
  const stripeFrame = page.frameLocator('iframe[title="Secure payment input frame"]');
  
  if (stripeFrame) {
    // Fill in test card details
    await stripeFrame.locator('[data-elements-stable-field-name="cardNumber"]').fill('4242424242424242');
    await stripeFrame.locator('[data-elements-stable-field-name="cardExpiry"]').fill('1230');
    await stripeFrame.locator('[data-elements-stable-field-name="cardCvc"]').fill('123');
    await stripeFrame.locator('[data-elements-stable-field-name="postalCode"]').fill('12345');
  } else {
    // Fallback: try to find Stripe elements by common selectors
    try {
      await page.locator('[data-elements-stable-field-name="cardNumber"]').fill('4242424242424242');
      await page.locator('[data-elements-stable-field-name="cardExpiry"]').fill('1230');
      await page.locator('[data-elements-stable-field-name="cardCvc"]').fill('123');
      await page.locator('[data-elements-stable-field-name="postalCode"]').fill('12345');
    } catch (error) {
      console.warn('Could not find Stripe form elements, payment test may fail');
    }
  }
  
  // Wait a moment for the form to process
  await page.waitForTimeout(1000);
}
