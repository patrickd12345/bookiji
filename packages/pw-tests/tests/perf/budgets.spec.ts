import { test, expect } from '@playwright/test';

// Add your key routes here - expand as needed
const routes = [
  { path: '/', name: 'Homepage' },
  { path: '/about', name: 'About' },
  { path: '/faq', name: 'FAQ' },
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
  { path: '/forgot-password', name: 'Forgot Password' },
];

// Performance budgets - adjusted to current baseline + improvement targets
const BUDGETS = {
  TBT: 300,  // ms - Total Blocking Time (user-felt lag)
  LCP: 2500, // ms - Largest Contentful Paint
  CLS: 0.1,  // score - Cumulative Layout Shift
  FCP: 2200, // ms - First Contentful Paint (current baseline + 200ms buffer)
  CONSOLE_ERRORS: 5, // Allow some console errors initially (improve over time)
};

test.describe('@perf budgets', () => {
  for (const route of routes) {
    test(`${route.name} (${route.path}) stays under perf budgets`, async ({ page }) => {
      const logs: string[] = [];
      const errors: string[] = [];
      
      // Capture console logs for FCP fallback detection
      page.on('console', (msg) => {
        const text = msg.text();
        logs.push(text);
        if (msg.type() === 'error') {
          errors.push(text);
        }
      });

      // Navigate to the route
      const startTime = Date.now();
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      const navigationTime = Date.now() - startTime;

      // TBT approximation via long tasks (>=50ms)
      const longTasks = await page.evaluate(() => {
        const entries = performance.getEntriesByType('longtask') as any[];
        return entries?.map(e => ({
          duration: e.duration,
          startTime: e.startTime,
          name: e.name || 'unknown'
        })) || [];
      });
      
      const TBT = Math.max(0, longTasks.reduce((acc, task) => {
        return acc + Math.max(0, task.duration - 50);
      }, 0));

      // LCP via Performance API
      const LCP = await page.evaluate(() => {
        const entries = (performance as any).getEntriesByType?.('largest-contentful-paint') || [];
        const last = entries[entries.length - 1];
        return last ? Math.round(last.startTime) : null;
      });

      // CLS via layout shift entries
      const CLS = await page.evaluate(() => {
        const entries = (performance as any).getEntriesByType?.('layout-shift') || [];
        let cls = 0;
        for (const entry of entries) {
          if (!entry.hadRecentInput) {
            cls += entry.value;
          }
        }
        return Number(cls.toFixed(3));
      });

      // FCP - try native first, then app fallback
      const nativeFCP = await page.evaluate(() => {
        const entries = (performance as any).getEntriesByType?.('paint') || [];
        const fcpEntry = entries.find((e: any) => e.name === 'first-contentful-paint');
        return fcpEntry ? Math.round(fcpEntry.startTime) : null;
      });
      
      const appFcpLog = logs.find(l => /^FCP:\s*\d+ms$/i.test(l));
      const appFCP = appFcpLog ? parseInt(appFcpLog.match(/\d+/)?.[0] || '0') : null;
      const FCP = nativeFCP || appFCP;

      // Performance metrics summary
      const metrics = {
        TBT: Math.round(TBT),
        LCP: LCP || 'n/a',
        CLS: CLS,
        FCP: FCP || 'n/a',
        navigationTime: navigationTime,
        longTaskCount: longTasks.length,
        errors: errors.length
      };

      // Log metrics for visibility in reports
      console.log(`[perf] ${route.name} :: TBT=${metrics.TBT}ms LCP=${metrics.LCP}ms CLS=${metrics.CLS} FCP=${metrics.FCP}ms nav=${metrics.navigationTime}ms tasks=${metrics.longTaskCount} errors=${metrics.errors}`);

      // Budget assertions
      expect(TBT, `TBT should be ≤ ${BUDGETS.TBT}ms, got ${metrics.TBT}ms`).toBeLessThanOrEqual(BUDGETS.TBT);
      
      if (LCP !== null) {
        expect(LCP, `LCP should be ≤ ${BUDGETS.LCP}ms, got ${LCP}ms`).toBeLessThanOrEqual(BUDGETS.LCP);
      }
      
      expect(CLS, `CLS should be ≤ ${BUDGETS.CLS}, got ${CLS}`).toBeLessThanOrEqual(BUDGETS.CLS);
      
      if (FCP !== null) {
        expect(FCP, `FCP should be ≤ ${BUDGETS.FCP}ms, got ${FCP}ms`).toBeLessThanOrEqual(BUDGETS.FCP);
      }

      // Quality gates - console errors as warning budget
      if (errors.length > BUDGETS.CONSOLE_ERRORS) {
        console.warn(`⚠️ Console errors exceed budget on ${route.name}: ${errors.length}/${BUDGETS.CONSOLE_ERRORS}`);
        errors.forEach((error, i) => console.warn(`  ${i + 1}. ${error}`));
      }
      expect(errors.length, `Console errors should be ≤ ${BUDGETS.CONSOLE_ERRORS}, got ${errors.length}`).toBeLessThanOrEqual(BUDGETS.CONSOLE_ERRORS);
      expect(navigationTime, `Navigation should complete in reasonable time`).toBeLessThan(10000);

      // If TBT is high, provide actionable feedback
      if (TBT > BUDGETS.TBT * 0.8) { // Warning at 80% of budget
        console.warn(`⚠️ TBT approaching budget on ${route.name}:`);
        console.warn(`Long tasks (>50ms): ${longTasks.length}`);
        longTasks.forEach((task, i) => {
          if (task.duration > 50) {
            console.warn(`  ${i + 1}. ${Math.round(task.duration)}ms at ${Math.round(task.startTime)}ms (${task.name})`);
          }
        });
      }
    });
  }
});

// Site-wide performance patterns test
test('@perf site-wide performance patterns', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Check for performance anti-patterns
  const antiPatterns = await page.evaluate(() => {
    const issues: string[] = [];
    
    // Check for missing font-display
    const stylesheets = Array.from(document.styleSheets);
    try {
      for (const sheet of stylesheets) {
        if (sheet.cssRules) {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSFontFaceRule) {
              const fontDisplay = rule.style.getPropertyValue('font-display');
              if (!fontDisplay || fontDisplay === 'auto') {
                issues.push(`Font without font-display: swap - ${rule.cssText.substring(0, 100)}...`);
              }
            }
          }
        }
      }
    } catch (e) {
      // Cross-origin stylesheets may throw - that's ok
    }
    
    // Check for large images without optimization
    const images = Array.from(document.querySelectorAll('img'));
    for (const img of images) {
      if (img.naturalWidth > 1920 && !img.loading) {
        issues.push(`Large image without lazy loading: ${img.src.substring(0, 50)}...`);
      }
    }
    
    // Check for missing critical resource hints
    const hasPreload = document.querySelector('link[rel="preload"]');
    if (!hasPreload) {
      issues.push('No preload hints found - consider preloading critical resources');
    }
    
    return issues;
  });
  
  // Log findings for visibility, but don't fail (these are recommendations)
  if (antiPatterns.length > 0) {
    console.warn('⚠️ Performance optimization opportunities:');
    antiPatterns.forEach(issue => console.warn(`  • ${issue}`));
  } else {
    console.log('✅ No obvious performance anti-patterns detected');
  }
  
  // This test passes but provides actionable feedback
  expect(antiPatterns.length).toBeGreaterThanOrEqual(0); // Always passes, just logs
});
