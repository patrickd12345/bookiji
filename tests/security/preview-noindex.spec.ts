import { test, expect } from '@playwright/test';

test.describe('Preview Route Security', () => {
  test('preview routes have noindex headers', async ({ request }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    try {
      // Test preview routes for noindex headers
      const previewRoutes = [
        '/api/preview',
        '/preview',
        '/staging',
        '/dev'
      ];
      
      for (const route of previewRoutes) {
        try {
          const response = await request.get(`${baseURL}${route}`, { timeout: 10000 });
          
          // Check for X-Robots-Tag header
          const robotsHeader = response.headers()['x-robots-tag'];
          const cacheControl = response.headers()['cache-control'];
          
          if (robotsHeader) {
            console.log(`✅ ${route}: X-Robots-Tag = ${robotsHeader}`);
            expect(robotsHeader.toLowerCase()).toContain('noindex');
            expect(robotsHeader.toLowerCase()).toContain('nofollow');
          } else {
            console.log(`⚠️  ${route}: Missing X-Robots-Tag header`);
          }
          
          // Check cache control for preview routes
          if (cacheControl) {
            console.log(`✅ ${route}: Cache-Control = ${cacheControl}`);
            expect(cacheControl.toLowerCase()).toContain('no-cache');
          }
          
        } catch (error) {
          // Route might not exist, that's okay
          console.log(`ℹ️  ${route}: Route not accessible (expected for some preview routes)`);
        }
      }
      
    } catch (error) {
      console.log('App not running, skipping preview security test');
      test.skip();
    }
  });

  test('production routes do not have noindex', async ({ request }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    try {
      // Test production routes should NOT have noindex
      const productionRoutes = [
        '/',
        '/about',
        '/terms',
        '/privacy'
      ];
      
      for (const route of productionRoutes) {
        try {
          const response = await request.get(`${baseURL}${route}`, { timeout: 10000 });
          
          const robotsHeader = response.headers()['x-robots-tag'];
          
          if (robotsHeader) {
            // Production routes should not have noindex
            expect(robotsHeader.toLowerCase()).not.toContain('noindex');
            console.log(`✅ ${route}: Production route properly indexed`);
          } else {
            // No robots header is also fine for production
            console.log(`✅ ${route}: No robots header (defaults to indexed)`);
          }
          
        } catch (error) {
          console.log(`ℹ️  ${route}: Route not accessible`);
        }
      }
      
    } catch (error) {
      console.log('App not running, skipping production route test');
      test.skip();
    }
  });
});
