# Automated QA Pipeline

This document describes the automated QA pipeline that uses Playwright to crawl the Bookiji app, discover user journeys, and generate comprehensive tests with accessibility checks.

## Overview

The pipeline consists of three main components:

1. **Site Crawler** - Discovers user journeys by crawling the app
2. **Test Generator** - Creates Playwright tests from discovered journeys
3. **Test Runner** - Executes tests with accessibility validation

## Quick Start

```bash
# 1. Crawl the site to discover user journeys
pnpm crawl

# 2. Generate Playwright tests from crawl results
pnpm generate:e2e

# 3. Run the generated tests with accessibility checks
pnpm test:e2e
```

## Components

### 1. Site Crawler (`scripts/crawl-site.ts`)

The crawler uses Playwright to:
- Visit pages starting from the homepage
- Discover interactive elements (links, buttons, forms)
- Record user journeys with depth limiting
- Save results to `crawl-output.json`

**Features:**
- Configurable crawl depth (default: 2)
- Discovers links, buttons, and forms
- Generates focused journeys for auth, navigation, and forms
- Handles relative and absolute URLs
- Skips external links

**Environment Variables:**
- `BASE_URL` - Target URL (default: http://localhost:3000)
- `MAX_DEPTH` - Maximum crawl depth (default: 2)

### 2. Test Generator (`scripts/generate-tests.ts`)

The generator creates Playwright tests that:
- Replay discovered user journeys
- Include accessibility checks after each step
- Use mock data for forms (test@example.com, Password123!)
- Generate descriptive test names

**Output:**
- Creates `tests/generated.spec.ts`
- One test per discovered journey
- Accessibility validation with axe-core
- Comprehensive error handling

### 3. Test Runner

Executes generated tests with:
- HTML reporter for detailed results
- Accessibility validation using axe-core
- Parallel test execution
- Detailed failure reporting

## Generated Test Structure

```typescript
test.describe('Generated Journey Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Inject axe-core for accessibility testing
    await injectAxe(page);
  });

  test('Journey 1 - Homepage', async ({ page }) => {
    // Step 1: Visit homepage
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL('http://localhost:3000');
    
    // Accessibility check after each step
    await checkA11y(page, undefined, { 
      detailedReport: true, 
      detailedReportOptions: { html: true } 
    });

    // Step 2: Click navigation link
    await page.waitForSelector('a[href="/about"]');
    await page.click('a[href="/about"]');
    await page.waitForTimeout(500);
    
    // Final accessibility check
    await checkA11y(page, undefined, { 
      detailedReport: true, 
      detailedReportOptions: { html: true } 
    });
  });
});
```

## Configuration

### Crawl Settings

Modify `scripts/crawl-site.ts` to adjust:
- Default base URL
- Maximum crawl depth
- Element discovery logic
- Journey generation rules

### Test Generation

Modify `scripts/generate-tests.ts` to adjust:
- Test output location
- Mock data values
- Accessibility check options
- Test naming conventions

### Test Execution

Modify `package.json` scripts to adjust:
- Test reporter type
- Test directory
- Execution options

## Accessibility Coverage

The pipeline provides comprehensive accessibility testing:

- **WCAG Compliance** - Uses axe-core for automated checks
- **Color Contrast** - Validates text/background ratios
- **Form Labels** - Ensures proper input labeling
- **Keyboard Navigation** - Tests tab order and focus management
- **Screen Reader Support** - Validates ARIA attributes
- **Detailed Reports** - HTML reports with specific violations

## Troubleshooting

### Common Issues

1. **Crawl fails to start**
   - Ensure Bookiji app is running on localhost:3000
   - Check network connectivity
   - Verify Playwright installation

2. **No journeys discovered**
   - Check if app has interactive elements
   - Verify selectors in crawl logic
   - Check console for errors

3. **Tests fail to generate**
   - Ensure `crawl-output.json` exists
   - Check file permissions
   - Verify TypeScript compilation

4. **Accessibility checks fail**
   - Review axe-core violations
   - Check generated HTML reports
   - Verify axe-core injection

### Debug Mode

Enable verbose logging by modifying scripts:
```typescript
// Add debug logging
console.log('Debug: Processing element:', element);
```

## Best Practices

1. **Regular Crawling** - Run crawls after major UI changes
2. **Test Review** - Review generated tests before execution
3. **Accessibility Focus** - Address axe-core violations promptly
4. **Journey Validation** - Verify discovered journeys make sense
5. **Performance Monitoring** - Monitor test execution time

## Integration

The pipeline integrates with:
- **CI/CD** - Add to build pipelines
- **Quality Gates** - Block deployments on test failures
- **Monitoring** - Track accessibility metrics over time
- **Reporting** - Generate accessibility compliance reports

## Future Enhancements

Potential improvements:
- **Visual Regression Testing** - Screenshot comparison
- **Performance Testing** - Lighthouse integration
- **Cross-browser Testing** - Multiple browser support
- **Mobile Testing** - Responsive design validation
- **API Testing** - Backend endpoint validation
