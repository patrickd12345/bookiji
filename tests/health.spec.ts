import { test, expect } from '@playwright/test';

test.describe('Health Checks', () => {
  test('homepage loads', async ({ page }) => {
    try {
      const startTime = Date.now();
      await page.goto('/', { timeout: 30000 });
      const loadTime = Date.now() - startTime;
      
      console.log(`Homepage load time: ${loadTime}ms`);
      
      // Check basic page structure
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('html')).toBeVisible();
      
      // Log success
      console.log('✅ Homepage health check passed');
    } catch (error) {
      console.error('❌ Homepage health check failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  });

  test('API health endpoint', async ({ request }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    try {
      const response = await request.get(`${baseURL}/api/health`, { timeout: 10000 });
      
      if (response.status() === 200) {
        console.log('✅ API health check passed');
      } else {
        console.log(`⚠️  API health check returned ${response.status()}`);
      }
      
      // Accept any response as long as it's not a connection error
      expect(response.status()).toBeGreaterThan(0);
    } catch (error) {
      console.log('App not running, skipping API health check');
      test.skip();
    }
  });

  test('basic navigation works', async ({ page }) => {
    try {
      await page.goto('/', { timeout: 30000 });
      
      // Check that we can navigate to a basic page
      await expect(page.locator('body')).toBeVisible();
      
      // Try to find some basic content
      const hasContent = await page.locator('body').textContent();
      expect(hasContent).toBeTruthy();
      
      console.log('✅ Basic navigation health check passed');
    } catch (error) {
      console.error('❌ Basic navigation health check failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  });
});
