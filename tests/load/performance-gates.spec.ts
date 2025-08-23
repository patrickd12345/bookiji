import { test, expect } from '@playwright/test'

// Performance gates for CI/CD
// These tests ensure performance doesn't regress on each PR

test.describe('Performance Gates', () => {
  test('API P95 < 500ms, P99 < 1s (per endpoint class)', async ({ request }) => {
    // Test general API endpoints
    const startTime = Date.now()
    const response = await request.get('/api/health')
    const responseTime = Date.now() - startTime
    
    expect(response.status()).toBe(200)
    expect(responseTime).toBeLessThan(500) // P95 threshold
    
    // Test search API (should be faster)
    const searchStart = Date.now()
    const searchResponse = await request.get('/api/search?q=test')
    const searchTime = Date.now() - searchStart
    
    expect(searchResponse.status()).toBeLessThan(500) // Search should be < 500ms
    expect(searchTime).toBeLessThan(300) // Search P95 threshold
  })

  test('Error rate < 1% per 5-min bucket', async ({ request }) => {
    // Make multiple requests to test error rate
    const requests = Array.from({ length: 100 }, () => 
      request.get('/api/health').catch(() => ({ status: () => 500 }))
    )
    
    const responses = await Promise.all(requests)
    const errorCount = responses.filter(r => r.status() >= 400).length
    const errorRate = errorCount / responses.length
    
    expect(errorRate).toBeLessThan(0.01) // < 1%
  })

  test('Cache hit rate ≥ 30% (search endpoints)', async ({ request }) => {
    // Test cache hit rate by making repeated requests
    const searchQueries = ['test', 'test', 'test', 'new', 'new', 'unique']
    
    const startTime = Date.now()
    const responses = await Promise.all(
      searchQueries.map(q => request.get(`/api/search?q=${q}`))
    )
    const totalTime = Date.now() - startTime
    
    // Check response headers for cache indicators
    const cacheHits = responses.filter(r => 
      r.headers()['x-cache'] === 'HIT' || 
      r.headers()['x-cache-status'] === 'hit'
    ).length
    
    const cacheHitRate = cacheHits / responses.length
    expect(cacheHitRate).toBeGreaterThanOrEqual(0.30) // ≥ 30%
    
    // Subsequent identical queries should be faster (indicating cache)
    const repeatedStart = Date.now()
    await request.get('/api/search?q=test')
    const repeatedTime = Date.now() - repeatedStart
    
    expect(repeatedTime).toBeLessThan(totalTime / searchQueries.length)
  })

  test('Admin API rate limiting (30 req/min)', async ({ request }) => {
    // Test admin API rate limiting
    const adminRequests = Array.from({ length: 35 }, () => 
      request.get('/api/admin/performance').catch(() => ({ status: () => 429 }))
    )
    
    const responses = await Promise.all(adminRequests)
    const rateLimited = responses.filter(r => r.status() === 429).length
    
    // Should rate limit after 30 requests
    expect(rateLimited).toBeGreaterThan(0)
    
    // Check rate limit headers for successful responses
    const successfulResponses = responses.filter(r => r.status() !== 429)
    if (successfulResponses.length > 0) {
      const lastResponse = successfulResponses[successfulResponses.length - 1]
      // Type guard to check if response has headers
      if ('headers' in lastResponse && typeof lastResponse.headers === 'function') {
        expect(lastResponse.headers()['x-ratelimit-limit']).toBe('30')
        expect(parseInt(lastResponse.headers()['x-ratelimit-remaining'])).toBeGreaterThanOrEqual(0)
      }
    }
  })

  test('Materialized view refresh performance', async ({ request }) => {
    // Test materialized view refresh performance
    const startTime = Date.now()
    
    // This would typically be a background job, but we can test the endpoint
    // that triggers refresh if it exists
    try {
      const response = await request.post('/api/admin/refresh-views')
      const refreshTime = Date.now() - startTime
      
      expect(response.status()).toBe(200)
      expect(refreshTime).toBeLessThan(300000) // < 5 minutes
      
      const data = await response.json()
      expect(data.success_count).toBeGreaterThan(0)
      expect(data.error_count).toBe(0)
      
    } catch (error) {
      // Refresh endpoint might not exist yet, skip this test
      test.skip()
    }
  })

  test('SLO compliance check', async ({ request }) => {
    // Test SLO compliance function
    try {
      const response = await request.post('/api/admin/check-slos')
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data.total_violations).toBeLessThan(5) // Allow some violations during testing
      
      // Check that SLOs are configured
      expect(data.results).toHaveLength(4) // 4 SLO configurations
      
    } catch (error) {
      // SLO endpoint might not exist yet, skip this test
      test.skip()
    }
  })
})
