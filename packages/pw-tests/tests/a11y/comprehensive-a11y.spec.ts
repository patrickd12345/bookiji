import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Guard against Vitest globals leaking into Playwright env
test.beforeAll(() => {
  if ((globalThis as any).vi || (globalThis as any).vitest) {
    throw new Error('Vitest globals detected in Playwright environment.');
  }
});

// Pages to test for accessibility
const PAGES_TO_TEST = [
  { path: '/', name: 'Homepage' },
  { path: '/about', name: 'About' },
  { path: '/how-it-works', name: 'How It Works' },
  { path: '/faq', name: 'FAQ' },
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
  { path: '/get-started', name: 'Get Started' },
  { path: '/demo/credits', name: 'Demo Credits' },
  { path: '/help', name: 'Help' },
  { path: '/compliance', name: 'Compliance' },
];

// Ensure artifacts directory exists
const ensureArtifactsDir = () => {
  const artifactsDir = join(process.cwd(), 'test-results', 'a11y-artifacts');
  try {
    mkdirSync(artifactsDir, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
  return artifactsDir;
};

// Generate detailed violation report
const generateViolationReport = (pageName: string, violations: any[], page: any) => {
  const artifactsDir = ensureArtifactsDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseFilename = `${pageName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;
  
  // JSON report with full violation details
  const jsonReport = {
    page: pageName,
    url: page.url(),
    timestamp: new Date().toISOString(),
    violations: violations,
    summary: {
      total: violations.length,
      byImpact: violations.reduce((acc: any, v) => {
        acc[v.impact] = (acc[v.impact] || 0) + 1;
        return acc;
      }, {}),
      byRule: violations.reduce((acc: any, v) => {
        acc[v.id] = (acc[v.id] || 0) + 1;
        return acc;
      }, {}),
    }
  };
  
  const jsonPath = join(artifactsDir, `${baseFilename}.json`);
  writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
  
  // HTML report for easy viewing
  const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>A11y Report - ${pageName}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
        .violation { border: 1px solid #e1e5e9; margin: 20px 0; padding: 20px; border-radius: 8px; }
        .critical { border-left: 4px solid #dc3545; background: #fff5f5; }
        .serious { border-left: 4px solid #fd7e14; background: #fff8f0; }
        .moderate { border-left: 4px solid #ffc107; background: #fffbeb; }
        .minor { border-left: 4px solid #20c997; background: #f0fdf4; }
        .impact { font-weight: bold; padding: 4px 8px; border-radius: 4px; color: white; }
        .impact.critical { background: #dc3545; }
        .impact.serious { background: #fd7e14; }
        .impact.moderate { background: #ffc107; color: #000; }
        .impact.minor { background: #20c997; }
        .rule-id { font-family: monospace; background: #f8f9fa; padding: 2px 6px; border-radius: 4px; }
        .target { font-family: monospace; background: #e9ecef; padding: 2px 6px; border-radius: 4px; margin: 5px 0; }
        .help { color: #6c757d; font-style: italic; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .summary h2 { margin-top: 0; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 15px 0; }
        .stat { text-align: center; padding: 15px; background: white; border-radius: 6px; border: 1px solid #dee2e6; }
        .stat-number { font-size: 2em; font-weight: bold; }
        .stat-label { color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <h1>Accessibility Report: ${pageName}</h1>
    <div class="summary">
        <h2>Summary</h2>
        <div class="stats">
            <div class="stat">
                <div class="stat-number">${violations.length}</div>
                <div class="stat-label">Total Violations</div>
            </div>
            <div class="stat">
                <div class="stat-number">${jsonReport.summary.byImpact.critical || 0}</div>
                <div class="stat-label">Critical</div>
            </div>
            <div class="stat">
                <div class="stat-number">${jsonReport.summary.byImpact.serious || 0}</div>
                <div class="stat-label">Serious</div>
            </div>
            <div class="stat">
                <div class="stat-number">${jsonReport.summary.byImpact.moderate || 0}</div>
                <div class="stat-label">Moderate</div>
            </div>
            <div class="stat">
                <div class="stat-number">${jsonReport.summary.byImpact.minor || 0}</div>
                <div class="stat-label">Minor</div>
            </div>
        </div>
        <p><strong>URL:</strong> ${page.url()}</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
    </div>
    
    ${violations.length === 0 ? '<p style="color: green; font-size: 1.2em;">✅ No accessibility violations found!</p>' : ''}
    
    ${violations.map(violation => `
        <div class="violation ${violation.impact}">
            <h3>
                <span class="impact ${violation.impact}">${violation.impact.toUpperCase()}</span>
                <span class="rule-id">${violation.id}</span>
            </h3>
            <p><strong>${violation.help}</strong></p>
            <p class="help">${violation.description}</p>
            <p><strong>WCAG:</strong> ${violation.tags.filter((t: string) => t.startsWith('wcag')).join(', ')}</p>
            <h4>Affected Elements (${violation.nodes.length}):</h4>
            ${violation.nodes.map((node: any) => `
                <div class="target">${node.target.join(' ')}</div>
                <p>${node.failureSummary}</p>
            `).join('')}
        </div>
    `).join('')}
</body>
</html>`;
  
  const htmlPath = join(artifactsDir, `${baseFilename}.html`);
  writeFileSync(htmlPath, htmlReport);
  
  console.log(`📊 A11y artifacts saved: ${jsonPath} and ${htmlPath}`);
  
  return { jsonPath, htmlPath };
};

// Test each page for accessibility
for (const pageInfo of PAGES_TO_TEST) {
  test(`a11y: ${pageInfo.name} meets WCAG 2.1 A/AA standards`, async ({ page }) => {
    await page.goto(pageInfo.path);
    
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
    
    // Run axe with comprehensive rules
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    // Generate detailed reports if violations exist
    if (results.violations.length > 0) {
      const artifacts = generateViolationReport(pageInfo.name, results.violations, page);
      
      // Log violations to console for CI visibility
      console.error(`❌ ${results.violations.length} accessibility violations found on ${pageInfo.name}:`);
      results.violations.forEach(violation => {
        console.error(`  • ${violation.id} (${violation.impact}): ${violation.help}`);
        console.error(`    Affects ${violation.nodes.length} element(s)`);
      });
      
      // Fail the test but provide detailed information
      expect(results.violations, `Found ${results.violations.length} accessibility violations on ${pageInfo.name}. Check artifacts for details.`).toHaveLength(0);
    } else {
      console.log(`✅ No accessibility violations found on ${pageInfo.name}`);
    }
  });
}

// Test for common accessibility patterns across the site
test('a11y: site-wide accessibility patterns', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Check for skip link
  const skipLink = page.locator('a[href^="#"]').filter({ hasText: /skip|Skip|SKIP/ });
  if (await skipLink.count() > 0) {
    await expect(skipLink.first()).toBeVisible();
  }
  
  // Check for proper heading structure
  const headings = page.locator('h1, h2, h3, h4, h5, h6');
  const headingCount = await headings.count();
  expect(headingCount).toBeGreaterThan(0);
  
  // Check for main landmark
  const main = page.locator('main, [role="main"]');
  if (await main.count() > 0) {
    await expect(main.first()).toBeVisible();
  }
  
  // Check for navigation landmark
  const nav = page.locator('nav, [role="navigation"]');
  if (await nav.count() > 0) {
    await expect(nav.first()).toBeVisible();
  }
  
  // Check for proper language attribute
  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang');
  
  // Check for proper title
  const title = await page.title();
  expect(title).toBeTruthy();
  expect(title.length).toBeGreaterThan(0);
});
