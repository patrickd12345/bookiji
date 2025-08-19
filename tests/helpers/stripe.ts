import { Page, FrameLocator, expect } from '@playwright/test';

// Finds the unified Stripe card element iframe reliably.
export function stripeCardFrame(page: Page): FrameLocator {
  return page.frameLocator('iframe[name^="__privateStripeFrame"], iframe[src*="stripe.com"]');
}

export async function fillStripeCard(page: Page, opts?: {
  number?: string; exp?: string; cvc?: string; postal?: string;
}) {
  const num = opts?.number ?? '4242424242424242';
  const exp = opts?.exp ?? '12/34';
  const cvc = opts?.cvc ?? '123';
  const postal = opts?.postal ?? '12345';

  const frame = stripeCardFrame(page);
  await frame.locator('input[name="cardnumber"], input[autocomplete="cc-number"]').fill(num);
  await frame.locator('input[name="exp-date"], input[autocomplete="cc-exp"]').fill(exp);
  await frame.locator('input[name="cvc"], input[autocomplete="cc-csc"]').fill(cvc);

  const postalField = frame.locator('input[autocomplete="postal-code"], input[name="postal"]');
  if (await postalField.count()) await postalField.fill(postal);

  // Assert Stripe formatted the number
  await expect(frame.locator('input[name="cardnumber"]')).toHaveValue(/4242\s?4242/);
}
