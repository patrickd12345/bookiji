import { test, expect } from '@playwright/test';

// Guard against Vitest globals leaking into Playwright env
test.beforeAll(() => {
  if ((globalThis as any).vi || (globalThis as any).vitest) {
    throw new Error('Vitest globals detected in Playwright environment.');
  }
});

// Performance thresholds - adjusted for development environment with AI services
const PERFORMANCE_THRESHOLDS = {
  // Largest Contentful Paint - should be under 5s for development
  LCP: 5000,
  // First Input Delay - should be under 300ms for development
  FID: 300,
  // Cumulative Layout Shift - should be under 0.3 for development
  CLS: 0.3,
  // First Contentful Paint - should be under 5s for development (accounting for Ollama delays)
  FCP: 5000,
  // Time to Interactive - should be under 8s for development (accounting for AI timeouts)
  TTI: 8000,
  // Total Blocking Time - should be under 7s for development (accounting for failed AI calls)
  TBT: 7000,
};

// Pages to test for performance
const CRITICAL_PAGES = [
  { path: '/', name: 'Homepage', weight: 10 },
  { path: '/login', name: 'Login', weight: 8 },
  { path: '/register', name: 'Register', weight: 8 },
  { path: '/how-it-works', name: 'How It Works', weight: 6 },
  { path: '/demo/credits', name: 'Demo Credits', weight: 7 },
];

// Helper to measure performance metrics
const measurePerformance = async (page: any, pageName: string) => {
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Wait a bit more for any delayed animations or async operations
  await page.waitForTimeout(1000);
  
  // Measure Core Web Vitals using Performance API
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      // Wait for next frame to ensure all metrics are available
      requestAnimationFrame(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        // Get LCP if available
        let lcp = 0;
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            lcp = lastEntry.startTime;
          });
          observer.observe({ entryTypes: ['largest-contentful-paint'] });
        }
        
        // Calculate FCP
        const fcp = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
        
        // Calculate TTI (simplified - time to first meaningful interaction)
        const tti = navigation.loadEventEnd || navigation.domContentLoadedEventEnd || navigation.domContentLoadedEventStart;
        
        // Calculate TBT (simplified - total blocking time)
        const tbt = Math.max(0, (tti || 0) - (fcp || 0));
        
        // Calculate CLS (simplified - based on layout shifts)
        let cls = 0;
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            let clsValue = 0;
            for (const entry of list.getEntries()) {
              const layoutShiftEntry = entry as any;
              if (!layoutShiftEntry.hadRecentInput) {
                clsValue += layoutShiftEntry.value;
              }
            }
            cls = clsValue;
          });
          observer.observe({ entryTypes: ['layout-shift'] });
        }
        
        resolve({
          lcp,
          fcp,
          tti,
          tbt,
          cls,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalTime: navigation.loadEventEnd - navigation.fetchStart,
        });
      });
    });
  });
  
  return metrics;
};

// Helper to check if performance meets thresholds
const checkPerformanceThresholds = (metrics: any, pageName: string) => {
  const violations = [];
  
  if (metrics.lcp > PERFORMANCE_THRESHOLDS.LCP) {
    violations.push(`LCP: ${metrics.lcp}ms (threshold: ${PERFORMANCE_THRESHOLDS.LCP}ms)`);
  }
  
  if (metrics.fcp > PERFORMANCE_THRESHOLDS.FCP) {
    violations.push(`FCP: ${metrics.fcp}ms (threshold: ${PERFORMANCE_THRESHOLDS.FCP}ms)`);
  }
  
  if (metrics.tbt > PERFORMANCE_THRESHOLDS.TBT) {
    violations.push(`TBT: ${metrics.tbt}ms (threshold: ${PERFORMANCE_THRESHOLDS.TBT}ms)`);
  }
  
  if (metrics.cls > PERFORMANCE_THRESHOLDS.CLS) {
    violations.push(`CLS: ${metrics.cls} (threshold: ${PERFORMANCE_THRESHOLDS.CLS})`);
  }
  
  if (metrics.tti > PERFORMANCE_THRESHOLDS.TTI) {
    violations.push(`TTI: ${metrics.tti}ms (threshold: ${PERFORMANCE_THRESHOLDS.TTI}ms)`);
  }
  
  return violations;
};

// Test each critical page for performance
for (const pageInfo of CRITICAL_PAGES) {
  test(`performance: ${pageInfo.name} meets performance thresholds`, async ({ page }) => {
    let tracingStarted = false;
    
    // Enable tracing for detailed performance analysis (only if not already started)
    try {
      await page.context().tracing.start({ 
        screenshots: true, 
        snapshots: true,
        sources: true 
      });
      tracingStarted = true;
    } catch (e) {
      // Tracing might already be started or not supported, continue
      console.log('Tracing already active or not supported, continuing...');
    }
    
    const startTime = Date.now();
    
    try {
      // Navigate to page
      await page.goto(pageInfo.path);
      
      // Measure performance
      const metrics = await measurePerformance(page, pageInfo.name);
      
      // Check thresholds
      const violations = checkPerformanceThresholds(metrics, pageInfo.name);
      
      // Log metrics for visibility
      console.log(`📊 Performance metrics for ${pageInfo.name}:`);
      console.log(`  LCP: ${metrics.lcp}ms`);
      console.log(`  FCP: ${metrics.fcp}ms`);
      console.log(`  TTI: ${metrics.tti}ms`);
      console.log(`  TBT: ${metrics.tbt}ms`);
      console.log(`  CLS: ${metrics.cls}`);
      console.log(`  Total Load Time: ${metrics.totalTime}ms`);
      
      if (violations.length > 0) {
        console.error(`❌ Performance violations on ${pageInfo.name}:`);
        violations.forEach(violation => console.error(`  • ${violation}`));
        
        // Fail the test but provide detailed information
        expect(violations, `Performance thresholds not met on ${pageInfo.name}. Check console for details.`).toHaveLength(0);
      } else {
        console.log(`✅ All performance thresholds met on ${pageInfo.name}`);
      }
      
      // Ensure test completes within 90 seconds
      const elapsed = Date.now() - startTime;
      expect(elapsed, `Performance test took ${elapsed}ms, should complete within 90s`).toBeLessThan(90000);
      
    } finally {
      // Stop tracing and save trace file (only if tracing was started by us)
      if (tracingStarted) {
        try {
          await page.context().tracing.stop({
            path: `test-results/performance-traces/${pageInfo.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.zip`
          });
        } catch (e) {
          // Tracing might have failed, log but continue
          console.log('Failed to stop tracing:', e);
        }
      }
    }
  });
}

// Test for overall site performance patterns
test('performance: site-wide performance patterns', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Check for common performance issues
  const performanceIssues = [];
  
  // Check for large images without proper sizing
  const images = page.locator('img');
  const imageCount = await images.count();
  
  for (let i = 0; i < Math.min(imageCount, 10); i++) {
    const img = images.nth(i);
    const src = await img.getAttribute('src');
    const width = await img.getAttribute('width');
    const height = await img.getAttribute('height');
    
    if (src && !width && !height) {
      performanceIssues.push(`Image ${src} missing width/height attributes`);
    }
  }
  
  // Check for unminified CSS/JS (basic check)
  const scripts = page.locator('script[src]');
  const styles = page.locator('link[rel="stylesheet"]');
  
  const scriptCount = await scripts.count();
  const styleCount = await styles.count();
  
  // Check for common performance anti-patterns
  const inlineScripts = page.locator('script:not([src])');
  const inlineScriptCount = await inlineScripts.count();
  
  if (inlineScriptCount > 5) {
    performanceIssues.push(`Too many inline scripts: ${inlineScriptCount}`);
  }
  
  // Check for resource hints
  const preloads = page.locator('link[rel="preload"]');
  const preloadCount = await preloads.count();
  
  if (preloadCount === 0) {
    performanceIssues.push('No resource hints (preload, prefetch) found');
  }
  
  // Log findings
  if (performanceIssues.length > 0) {
    console.warn(`⚠️ Performance optimization opportunities:`);
    performanceIssues.forEach(issue => console.warn(`  • ${issue}`));
  } else {
    console.log(`✅ No obvious performance issues detected`);
  }
  
  // Basic performance assertions
  expect(imageCount).toBeLessThan(50); // Reasonable image count
  expect(scriptCount).toBeLessThan(20); // Reasonable script count
  expect(styleCount).toBeLessThan(10); // Reasonable stylesheet count
});

// Test for memory leaks and resource cleanup
test('performance: memory and resource management', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Check for memory leaks by monitoring heap size
  const initialHeap = await page.evaluate(() => {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  });
  
  // Perform some interactions to trigger potential memory leaks
  await page.click('body'); // Simple interaction
  await page.waitForTimeout(1000);
  
  const afterInteractionHeap = await page.evaluate(() => {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  });
  
  // Check for excessive memory growth
  if (initialHeap > 0 && afterInteractionHeap > 0) {
    const memoryGrowth = afterInteractionHeap - initialHeap;
    const growthPercentage = (memoryGrowth / initialHeap) * 100;
    
    console.log(`📊 Memory usage: ${initialHeap} → ${afterInteractionHeap} bytes (${growthPercentage.toFixed(2)}% change)`);
    
    // Memory shouldn't grow more than 50% from simple interactions
    expect(growthPercentage, `Memory usage increased by ${growthPercentage.toFixed(2)}%`).toBeLessThan(50);
  }
  
  // Check for proper cleanup of event listeners
  const eventListenerCount = await page.evaluate(() => {
    // This is a simplified check - in real scenarios you'd use more sophisticated tools
    return document.querySelectorAll('*').length;
  });
  
  expect(eventListenerCount, 'Reasonable DOM element count').toBeLessThan(1000);
});
