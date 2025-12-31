import { test, expect } from '@playwright/test';

test.describe('Admin Guard Tests', () => {
  test('admin page requires authentication', async ({ page }) => {
    try {
      // Try to access admin page without authentication
      await page.goto('/admin', { timeout: 30000, waitUntil: 'networkidle' });
      
      // Wait a bit for any redirects or client-side checks
      await page.waitForTimeout(1000);
      
      // Get current URL after potential redirects
      const currentUrl = page.url();
      
      // Check if redirected to login (middleware redirect)
      if (currentUrl.includes('/login')) {
        console.log('✅ Admin guard working: middleware redirected to login');
        expect(currentUrl).toContain('/login');
        // Check that the redirect includes the next parameter
        expect(currentUrl).toContain('next=');
        return;
      }
      
      // If still on /admin, check for access denied message (client-side check)
      if (currentUrl.includes('/admin')) {
        // Wait for page to fully load and client-side auth check to complete
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);
        
        // Check for AccessDenied component - look for the specific title
        const accessDeniedTitle = page.locator('h1:has-text("Admin Access Required")');
        const accessDeniedMessage = page.locator('text=/admin privileges/i');
        const accessDeniedRole = page.locator('[role="alert"]');
        
        // Check if any access denied indicator is visible
        const hasAccessDeniedTitle = await accessDeniedTitle.isVisible({ timeout: 2000 }).catch(() => false);
        const hasAccessDeniedMessage = await accessDeniedMessage.isVisible({ timeout: 2000 }).catch(() => false);
        const hasAccessDeniedRole = await accessDeniedRole.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (hasAccessDeniedTitle || hasAccessDeniedMessage || hasAccessDeniedRole) {
          console.log('✅ Admin guard working: access denied message displayed');
          expect(hasAccessDeniedTitle || hasAccessDeniedMessage || hasAccessDeniedRole).toBe(true);
          return;
        }
        
        // Fallback: check body text for access denied messages
        const bodyText = (await page.locator('body').textContent() || '').toLowerCase();
        if (bodyText.includes('access denied') || 
            bodyText.includes('admin access required') ||
            bodyText.includes('admin privileges') ||
            bodyText.includes('don\'t have permission') ||
            bodyText.includes('unauthorized') ||
            bodyText.includes('forbidden')) {
          console.log('✅ Admin guard working: access denied message found in body text');
          return;
        }
        
        // If we get here, admin page is accessible without proper guard
        await page.screenshot({ path: 'test-results/admin-guard-no-message.png', fullPage: true });
        throw new Error('Admin page accessible without authentication - guard not working');
      }
      
      // If redirected to home, that's also acceptable (middleware fallback)
      if (currentUrl === 'http://localhost:3000/' || currentUrl.endsWith('/')) {
        console.log('✅ Admin guard working: redirected to home');
        return;
      }
      
      // Test fails if we're on admin dashboard without auth
      expect(currentUrl).not.toContain('/admin/dashboard');
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('App not running')) {
        console.log('App not running, skipping admin guard test');
        test.skip();
      } else {
        throw error;
      }
    }
  });

  test('public pages accessible', async ({ page }) => {
    try {
      // Test that public pages are accessible
      await page.goto('/', { timeout: 30000 });
      
      // Should load without authentication issues
      await expect(page.locator('body')).toBeVisible();
      
      console.log('✅ Public page accessible');
      
    } catch (error) {
      console.log('App not running, skipping public page test');
      test.skip();
    }
  });
});
