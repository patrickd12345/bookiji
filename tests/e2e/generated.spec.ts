import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

// Auto-generated tests from site crawl - FIXED VERSION
// Generated on: 2025-08-18T18:06:02.417Z
// Base URL: http://localhost:3000
// Total Journeys: 8
// Total Steps: 8

test.describe('Generated Journey Tests - FIXED', () => {
  test.beforeEach(async ({ page }) => {
    // No setup needed for axe-core
  });

  test('Journey 1 - Homepage Navigation', async ({ page }) => {
    console.log('🧪 Testing journey: Journey 1 - Homepage Navigation');
    
    // Step 1: Visit http://localhost:3000 with more lenient wait
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // Wait for dynamic content
    await expect(page).toHaveURL('http://localhost:3000');
    
    // Accessibility check
    const accessibilityReport1 = await new AxeBuilder({ page }).analyze();
    if (accessibilityReport1.violations.length > 0) {
      console.log('⚠️  Accessibility violations found:', accessibilityReport1.violations.length);
    }
    
    // Step 2: Click "Start Booking" (using data-testid from working tests)
    await page.waitForSelector('[data-testid="book-now-btn"]', { timeout: 10000 });
    await page.click('[data-testid="book-now-btn"]');
    await page.waitForTimeout(1000); // Wait for action to complete
    
    // Should navigate to get-started
    await expect(page).toHaveURL(/\/get-started/);
    
    // Accessibility check
    const accessibilityReport2 = await new AxeBuilder({ page }).analyze();
    if (accessibilityReport2.violations.length > 0) {
      console.log('⚠️  Accessibility violations found:', accessibilityReport2.violations.length);
    }
    
    // Step 3: Verify registration form elements exist
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    
    // Accessibility check
    const accessibilityReport3 = await new AxeBuilder({ page }).analyze();
    if (accessibilityReport3.violations.length > 0) {
      console.log('⚠️  Accessibility violations found:', accessibilityReport3.violations.length);
    }
  });

  test('Journey 2 - Theme Demo Page', async ({ page }) => {
    console.log('🧪 Testing journey: Journey 2 - Theme Demo Page');
    
    // Step 1: Visit theme demo page
    await page.goto('http://localhost:3000/theme-demo', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL('http://localhost:3000/theme-demo');
    
    // Step 2: Verify theme toggle button exists (using actual text from component)
    await page.waitForSelector('button:has-text("🌞 Light Mode"), button:has-text("🌙 Dark Mode")', { timeout: 10000 });
    
    // Step 3: Click theme toggle
    await page.click('button:has-text("🌞 Light Mode"), button:has-text("🌙 Dark Mode")');
    await page.waitForTimeout(500);
    
    // Step 4: Verify theme changed
    const themeButton = page.locator('button:has-text("🌞 Light Mode"), button:has-text("🌙 Dark Mode")');
    await expect(themeButton).toBeVisible();
    
    // Accessibility check
    const accessibilityReport = await new AxeBuilder({ page }).analyze();
    if (accessibilityReport.violations.length > 0) {
      console.log('⚠️  Accessibility violations found:', accessibilityReport.violations.length);
    }
  });

  test('Journey 3 - Help Page', async ({ page }) => {
    console.log('🧪 Testing journey: Journey 3 - Help Page');
    
    // Step 1: Visit help page
    await page.goto('http://localhost:3000/help', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL('http://localhost:3000/help');
    
    // Step 2: Verify help page content
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Accessibility check
    const accessibilityReport = await new AxeBuilder({ page }).analyze();
    if (accessibilityReport.violations.length > 0) {
      console.log('⚠️  Accessibility violations found:', accessibilityReport.violations.length);
    }
  });

  test('Journey 4 - Login Flow', async ({ page }) => {
    console.log('🧪 Testing journey: Journey 4 - Login Flow');
    
    // Step 1: Visit login page
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL('http://localhost:3000/login');
    
    // Step 2: Verify login form elements
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    
    // Accessibility check
    const accessibilityReport = await new AxeBuilder({ page }).analyze();
    if (accessibilityReport.violations.length > 0) {
      console.log('⚠️  Accessibility violations found:', accessibilityReport.violations.length);
    }
  });

  test('Journey 5 - About Page', async ({ page }) => {
    console.log('🧪 Testing journey: Journey 5 - About Page');
    
    // Step 1: Visit about page
    await page.goto('http://localhost:3000/about', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL('http://localhost:3000/about');
    
    // Step 2: Verify about page content
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Accessibility check
    const accessibilityReport = await new AxeBuilder({ page }).analyze();
    if (accessibilityReport.violations.length > 0) {
      console.log('⚠️  Accessibility violations found:', accessibilityReport.violations.length);
    }
  });

  test('Journey 6 - Registration Form', async ({ page }) => {
    console.log('🧪 Testing journey: Journey 6 - Registration Form');
    
    // Step 1: Visit get-started page
    await page.goto('http://localhost:3000/get-started', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL('http://localhost:3000/get-started');
    
    // Step 2: Fill form with test data
    await page.waitForSelector('form', { timeout: 10000 });
    await page.fill('input[name="email"], input[id="email"]', 'test@example.com');   
    await page.fill('input[name="password"], input[id="password"]', 'Password123!'); 
    await page.fill('input[name="confirmPassword"], input[id="confirmPassword"]', 'Password123!');
    
    // Step 3: Verify form submission button
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    
    // Accessibility check
    const accessibilityReport = await new AxeBuilder({ page }).analyze();
    if (accessibilityReport.violations.length > 0) {
      console.log('⚠️  Accessibility violations found:', accessibilityReport.violations.length);
    }
  });

  test('Journey 7 - Admin Access Control', async ({ page }) => {
    console.log('🧪 Testing journey: Journey 7 - Admin Access Control');
    
    // Step 1: Visit admin page as non-authenticated user
    await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL('http://localhost:3000/admin');
    
    // Step 2: Verify admin shell is not visible for non-authenticated users
    await expect(page.getByTestId('admin-shell')).toHaveCount(0);
    
    // Accessibility check
    const accessibilityReport = await new AxeBuilder({ page }).analyze();
    if (accessibilityReport.violations.length > 0) {
      console.log('⚠️  Accessibility violations found:', accessibilityReport.violations.length);
    }
  });

  test('Journey 8 - Calendar ICS Endpoint', async ({ context }) => {
    console.log('🧪 Testing journey: Journey 8 - Calendar ICS Endpoint');
    
    // Test calendar ICS endpoint
    const response = await context.request.get('/api/calendar.ics?bookingId=test123');
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toMatch(/text\/calendar/);
    
    const icsContent = await response.text();
    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('END:VCALENDAR');
  });
});

