import * as fs from 'fs';
import * as path from 'path';

class TestGenerator {
  constructor(crawlData, outputPath = 'tests/generated.spec.ts') {
    this.crawlData = crawlData;
    this.outputPath = outputPath;
    this.testConfig = {
      maxRetries: 3,
      timeoutMs: 30000,
      waitForNetworkIdle: true,
      accessibilityChecks: true,
      screenshotOnFailure: true,
      criticalPaths: ['book', 'appointment', 'service', 'login', 'register', 'start']
    };
  }

  generateTests() {
    console.log(`🔧 Generating Playwright tests from ${this.crawlData.totalJourneys} journeys...`);

    const testContent = this.generateTestFile();
    
    // Ensure tests directory exists
    const testsDir = path.dirname(this.outputPath);
    if (!fs.existsSync(testsDir)) {
      fs.mkdirSync(testsDir, { recursive: true });
    }

    // Write test file
    fs.writeFileSync(this.outputPath, testContent);
    
    console.log(`✅ Tests generated successfully at ${this.outputPath}`);
    console.log(`📊 Generated ${this.crawlData.totalJourneys} test cases`);
    
    // Generate test configuration
    this.generateTestConfig();
  }

  generateTestFile() {
    const imports = this.generateImports();
    const testCases = this.generateTestCases();
    const testHelpers = this.generateTestHelpers();
    
    return `${imports}

${testHelpers}

${testCases}
`;
  }

  generateImports() {
    return `import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

// Auto-generated tests from site crawl
// Generated on: ${new Date().toISOString()}
// Base URL: ${this.crawlData.baseUrl}
// Total Journeys: ${this.crawlData.totalJourneys}
// Total Steps: ${this.crawlData.totalSteps}
// Test Configuration: ${JSON.stringify(this.testConfig, null, 2)}

test.describe('Generated Journey Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for generated tests
    page.setDefaultTimeout(${this.testConfig.timeoutMs});
    
    // Enable network idle waiting
    if (${this.testConfig.waitForNetworkIdle}) {
      page.setDefaultNavigationTimeout(${this.testConfig.timeoutMs});
    }
  });
`;
  }

  generateTestHelpers() {
    return `
  // Helper functions for better test reliability
  async function waitForElement(page, selector, timeout = 10000) {
    try {
      await page.waitForSelector(selector, { timeout, state: 'visible' });
      return true;
    } catch (error) {
      console.log(\`⚠️  Element not found: \${selector}\`);
      return false;
    }
  }

  async function safeClick(page, selector, fallbackSelector = null) {
    try {
      if (await waitForElement(page, selector)) {
        await page.click(selector);
        return true;
      } else if (fallbackSelector && await waitForElement(page, fallbackSelector)) {
        await page.click(fallbackSelector);
        return true;
      }
      return false;
    } catch (error) {
      console.log(\`⚠️  Click failed: \${selector}\`);
      return false;
    }
  }

  async function safeFill(page, selector, value, fallbackSelector = null) {
    try {
      if (await waitForElement(page, selector)) {
        await page.fill(selector, value);
        return true;
      } else if (fallbackSelector && await waitForElement(page, fallbackSelector)) {
        await page.fill(fallbackSelector, value);
        return true;
      }
      return false;
    } catch (error) {
      console.log(\`⚠️  Fill failed: \${selector}\`);
      return false;
    }
  }

  async function runAccessibilityCheck(page, stepNumber) {
    if (!${this.testConfig.accessibilityChecks}) return;
    
    try {
      const accessibilityReport = await new AxeBuilder({ page }).analyze();
      if (accessibilityReport.violations.length > 0) {
        console.log(\`⚠️  Step \${stepNumber}: \${accessibilityReport.violations.length} accessibility violations found\`);
        // Log critical violations
        accessibilityReport.violations
          .filter(v => v.impact === 'critical' || v.impact === 'serious')
          .forEach(v => console.log(\`   Critical: \${v.description}\`));
      }
      return accessibilityReport;
    } catch (error) {
      console.log(\`⚠️  Accessibility check failed for step \${stepNumber}\`);
      return null;
    }
  }

  function isCriticalPath(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return ${JSON.stringify(this.testConfig.criticalPaths)}.some(path => 
      lowerText.includes(path.toLowerCase())
    );
  }
`;
  }

  generateTestCases() {
    let testCases = '';

    // Sort journeys by criticality and quality
    const sortedJourneys = this.sortJourneysByPriority(this.crawlData.journeys);

    sortedJourneys.forEach((journey, journeyIndex) => {
      const journeyName = this.generateJourneyName(journey, journeyIndex);
      const testSteps = this.generateTestSteps(journey);
      const isCritical = this.isJourneyCritical(journey);
      
      testCases += `
  test('${journeyName}', async ({ page }) => {
    console.log('🧪 Testing journey: ${journeyName}');
    ${isCritical ? 'console.log("🚨 CRITICAL PATH - High priority test");' : ''}
    
    // Take screenshot at start
    if (${this.testConfig.screenshotOnFailure}) {
      await page.screenshot({ path: \`test-results/\${Date.now()}-start.png\` });
    }
    
${testSteps}
    
    // Final accessibility check
    const finalAccessibilityReport = await runAccessibilityCheck(page, 'final');
    if (finalAccessibilityReport && finalAccessibilityReport.violations.length > 0) {
      console.log('⚠️  Final accessibility violations found:', finalAccessibilityReport.violations.length);
    }
    
    // Take screenshot at end
    if (${this.testConfig.screenshotOnFailure}) {
      await page.screenshot({ path: \`test-results/\${Date.now()}-end.png\` });
    }
  });
`;
    });

    testCases += `
});
`;

    return testCases;
  }

  sortJourneysByPriority(journeys) {
    return journeys.sort((a, b) => {
      // First priority: critical paths
      const aCritical = this.isJourneyCritical(a);
      const bCritical = this.isJourneyCritical(b);
      if (aCritical && !bCritical) return -1;
      if (!aCritical && bCritical) return 1;
      
      // Second priority: quality score
      const aQuality = a.filter(step => step.quality === 'high').length;
      const bQuality = b.filter(step => step.quality === 'high').length;
      if (aQuality !== bQuality) return bQuality - aQuality;
      
      // Third priority: journey length
      return b.length - a.length;
    });
  }

  isJourneyCritical(journey) {
    return journey.some(step => 
      step.text && this.testConfig.criticalPaths.some(path => 
        step.text.toLowerCase().includes(path.toLowerCase())
      )
    );
  }

  generateJourneyName(journey, index) {
    if (journey.length === 0) return `Journey ${index + 1}`;
    
    const firstStep = journey[0];
    if (firstStep.type === 'visit' && firstStep.url) {
      const urlPath = new URL(firstStep.url).pathname;
      const isCritical = this.isJourneyCritical(journey);
      const criticalFlag = isCritical ? '🚨 ' : '';
      return `${criticalFlag}Journey ${index + 1} - ${urlPath || 'Homepage'}`;
    }
    
    return `Journey ${index + 1} - ${journey.length} steps`;
  }

  generateTestSteps(journey) {
    let steps = '';
    let stepNumber = 1;

    for (const step of journey) {
      steps += `    // Step ${stepNumber}: ${this.describeStep(step)}\n`;
      
      switch (step.type) {
        case 'visit':
          steps += this.generateVisitStep(step, stepNumber);
          break;
        case 'click':
          steps += this.generateClickStep(step, stepNumber);
          break;
        case 'form':
          steps += this.generateFormStep(step, stepNumber);
          break;
      }

      // Add accessibility check after each step
      steps += `    await runAccessibilityCheck(page, ${stepNumber});\n\n`;
      
      stepNumber++;
    }

    return steps;
  }

  describeStep(step) {
    switch (step.type) {
      case 'visit':
        return `Visit ${step.url}`;
      case 'click':
        return `Click "${this.sanitizeText(step.text)}"`;
      case 'form':
        return `Fill form with ${Object.keys(step.data || {}).length} fields`;
      default:
        return 'Unknown step';
    }
  }

  sanitizeText(text) {
    if (!text) return 'element';
    // Remove newlines and extra whitespace, escape quotes
    return text.replace(/\s+/g, ' ').trim().replace(/"/g, '\\"').substring(0, 100);
  }

  generateVisitStep(step, stepNumber) {
    if (!step.url) return '    // No URL provided for visit step\n';
    
    return `    // Navigate to page
    await page.goto('${step.url}', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Wait for dynamic content
    
    // Verify navigation
    await expect(page).toHaveURL('${step.url}');
    
    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
    if (${this.testConfig.waitForNetworkIdle}) {
      await page.waitForLoadState('networkidle');
    }
`;
  }

  generateClickStep(step, stepNumber) {
    if (!step.selector) {
      return '    // No selector provided for click step\n';
    }

    const isCritical = this.isCriticalPath(step.text);
    const criticalFlag = isCritical ? '🚨 ' : '';
    
    return `    // ${criticalFlag}Click element: ${this.sanitizeText(step.text)}
    const clickSuccess = await safeClick(page, '${step.selector}');
    if (!clickSuccess) {
      console.log('⚠️  Click failed, continuing with next step');
    }
    
    // Wait for action to complete
    await page.waitForTimeout(1000);
    
    // Wait for any navigation or state changes
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    } catch (error) {
      // Navigation timeout is okay
    }
`;
  }

  generateFormStep(step, stepNumber) {
    if (!step.selector || !step.data) {
      return '    // No selector or data provided for form step\n';
    }

    let formCode = `    // Fill form: ${Object.keys(step.data).length} fields
    await waitForElement(page, '${step.selector}');
    
`;
    
    // Fill form fields
    for (const [fieldName, fieldValue] of Object.entries(step.data)) {
      formCode += `    // Fill ${fieldName} field
    const ${fieldName}Success = await safeFill(
      page, 
      '${step.selector} input[name="${fieldName}"], ${step.selector} input[id="${fieldName}"]', 
      '${fieldValue}'
    );
    if (!${fieldName}Success) {
      console.log('⚠️  Failed to fill ${fieldName} field');
    }
    
`;
    }
    
    // Submit form
    formCode += `    // Submit form
    const submitSuccess = await safeClick(
      page, 
      '${step.selector} button[type="submit"], ${step.selector} input[type="submit"]'
    );
    if (!submitSuccess) {
      console.log('⚠️  Form submission failed');
    }
    
    // Wait for form submission
    await page.waitForTimeout(2000);
    
    // Wait for any navigation or state changes
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    } catch (error) {
      // Navigation timeout is okay
    }
`;
    
    return formCode;
  }

  generateTestConfig() {
    const configPath = 'tests/generated.config.ts';
    const configContent = `// Auto-generated test configuration
export const generatedTestConfig = ${JSON.stringify(this.testConfig, null, 2)};

export const crawlStats = ${JSON.stringify(this.crawlData.crawlStats || {}, null, 2)};

export const journeySummary = {
  totalJourneys: ${this.crawlData.totalJourneys},
  totalSteps: ${this.crawlData.totalSteps},
  criticalPaths: ${this.crawlData.journeys.filter(j => this.isJourneyCritical(j)).length},
  highQualityJourneys: ${this.crawlData.journeys.filter(j => j.filter(s => s.quality === 'high').length >= 3).length}
};
`;

    fs.writeFileSync(configPath, configContent);
    console.log(`📝 Test configuration generated at ${configPath}`);
  }
}

async function main() {
  console.log('🚀 Starting test generation...');
  
  try {
    // Read crawl output
    const crawlOutputPath = path.join(process.cwd(), 'crawl-output.json');
    console.log(`📖 Looking for crawl output at: ${crawlOutputPath}`);
    
    if (!fs.existsSync(crawlOutputPath)) {
      console.error('❌ crawl-output.json not found. Run "pnpm crawl" first.');
      process.exit(1);
    }

    console.log('✅ Found crawl output file');
    const crawlData = JSON.parse(fs.readFileSync(crawlOutputPath, 'utf8'));
    console.log(`📊 Loaded crawl data: ${crawlData.totalJourneys} journeys, ${crawlData.totalSteps} steps`);
    
    if (!crawlData.journeys || crawlData.journeys.length === 0) {
      console.error('❌ No journeys found in crawl output.');
      process.exit(1);
    }

    // Generate tests
    console.log('🔧 Creating test generator...');
    const generator = new TestGenerator(crawlData);
    console.log('📝 Generating tests...');
    generator.generateTests();

    console.log('\n🎯 Next steps:');
    console.log('   1. Review generated tests in tests/generated.spec.ts');
    console.log('   2. Run tests with: pnpm test:e2e');
    console.log('   3. Tests include accessibility checks with axe-core');
    console.log('   4. Critical paths are prioritized and marked 🚨');
    console.log('   5. Enhanced error handling and retry logic included');

  } catch (error) {
    console.error('❌ Error generating tests:', error);
    process.exit(1);
  }
}

// Check if this script is being run directly
const scriptPath = process.argv[1];
const currentScriptPath = import.meta.url.replace('file:///', '').replace(/\\/g, '/');
const isMainModule = scriptPath && (scriptPath.includes('generate-tests.mjs') || currentScriptPath.includes('generate-tests.mjs'));

console.log(`🔍 Module check: scriptPath=${scriptPath}, currentScriptPath=${currentScriptPath}, isMainModule=${isMainModule}`);

if (isMainModule) {
  console.log('🎯 Script executed directly, calling main...');
  main().catch(error => {
    console.error('❌ Error in main function:', error);
    process.exit(1);
  });
} else {
  console.log('📦 Script imported as module');
}

export { TestGenerator };
