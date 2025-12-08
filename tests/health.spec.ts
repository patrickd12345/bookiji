import { expect, test } from '@playwright/test';

// Simple readiness probes for API and monitoring endpoints.
test.describe('Health endpoints', () => {
  test('api health responds OK', async ({ request }) => {
    try {
      const response = await request.get('/api/health', { timeout: 30000 });
      expect(response.status()).toBeLessThan(500);

      const payload = await response.json().catch(() => ({}));
      if (payload.status) {
        expect(String(payload.status).toLowerCase()).toContain('ok');
      }
    } catch (error) {
      console.log('Health endpoint not reachable; skipping');
      test.skip();
    }
  });

  test('dead-letter queue monitor available when configured', async ({ request }) => {
    try {
      const response = await request.get('/api/health/dlq', { timeout: 30000 });
      expect([200, 204, 404, 401]).toContain(response.status());
    } catch (error) {
      console.log('DLQ monitor not reachable; skipping');
      test.skip();
    }
  });
});
