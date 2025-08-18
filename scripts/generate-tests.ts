import * as fs from 'fs';
import * as path from 'path';

interface JourneyStep {
  type: 'visit' | 'click' | 'form';
  url?: string;
  selector?: string;
  data?: Record<string, string>;
  text?: string;
  depth: number;
}

interface CrawlResult {
  baseUrl: string;
  timestamp: string;
  journeys: JourneyStep[][];
  totalSteps: number;
  totalJourneys: number;
}

class TestGenerator {
  private crawlData: CrawlResult;
  private outputPath: string;

  constructor(crawlData: CrawlResult, outputPath: string = 'tests/generated.spec.ts') {
    this.crawlData = crawlData;
    this.outputPath = outputPath;
  }

  generateTests(): void {
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
  }

  private generateTestFile(): string {
    const imports = this.generateImports();
    const testCases = this.generateTestCases();
    
    return `${imports}

${testCases}
`;
  }

  private generateImports(): string {
    return `import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

// Auto-generated tests from site crawl
// Generated on: ${new Date().toISOString()}
// Base URL: ${this.crawlData.baseUrl}
// Total Journeys: ${this.crawlData.totalJourneys}
// Total Steps: ${this.crawlData.totalSteps}

test.describe('Generated Journey Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Inject axe-core for accessibility testing
    await injectAxe(page);
  });
`;
  }

  private generateTestCases(): string {
    let testCases = '';

    this.crawlData.journeys.forEach((journey, journeyIndex) => {
      const journeyName = this.generateJourneyName(journey, journeyIndex);
      const testSteps = this.generateTestSteps(journey);
      
      testCases += `
  test('${journeyName}', async ({ page }) => {
    console.log('🧪 Testing journey: ${journeyName}');
${testSteps}
    
    // Final accessibility check
    await checkA11y(page, undefined, { 
      detailedReport: true, 
      detailedReportOptions: { html: true } 
    });
  });
`;
    });

    testCases += `
});
`;

    return testCases;
  }

  private generateJourneyName(journey: JourneyStep[], index: number): string {
    if (journey.length === 0) return `Journey ${index + 1}`;
    
    const firstStep = journey[0];
    if (firstStep.type === 'visit' && firstStep.url) {
      const urlPath = new URL(firstStep.url).pathname;
      return `Journey ${index + 1} - ${urlPath || 'Homepage'}`;
    }
    
    return `Journey ${index + 1} - ${journey.length} steps`;
  }

  private generateTestSteps(journey: JourneyStep[]): string {
    let steps = '';
    let stepNumber = 1;

    for (const step of journey) {
      steps += `    // Step ${stepNumber}: ${this.describeStep(step)}\n`;
      
      switch (step.type) {
        case 'visit':
          steps += this.generateVisitStep(step);
          break;
        case 'click':
          steps += this.generateClickStep(step);
          break;
        case 'form':
          steps += this.generateFormStep(step);
          break;
      }

      // Add accessibility check after each step
      steps += `    await checkA11y(page, undefined, { 
      detailedReport: true, 
      detailedReportOptions: { html: true } 
    });\n\n`;
      
      stepNumber++;
    }

    return steps;
  }

  private describeStep(step: JourneyStep): string {
    switch (step.type) {
      case 'visit':
        return `Visit ${step.url}`;
      case 'click':
        return `Click "${step.text || 'element'}"`;
      case 'form':
        return `Fill form with ${Object.keys(step.data || {}).length} fields`;
      default:
        return 'Unknown step';
    }
  }

  private generateVisitStep(step: JourneyStep): string {
    if (!step.url) return '    // No URL provided for visit step\n';
    
    return `    await page.goto('${step.url}', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000); // Wait for dynamic content
    await expect(page).toHaveURL('${step.url}');
`;
  }

  private generateClickStep(step: JourneyStep): string {
    if (!step.selector) {
      return '    // No selector provided for click step\n';
    }

    return `    await page.waitForSelector('${step.selector}');
    await page.click('${step.selector}');
    await page.waitForTimeout(500); // Wait for action to complete
`;
  }

  private generateFormStep(step: JourneyStep): string {
    if (!step.selector || !step.data) {
      return '    // No selector or data provided for form step\n';
    }

    let formCode = `    await page.waitForSelector('${step.selector}');
`;
    
    // Fill form fields
    for (const [fieldName, fieldValue] of Object.entries(step.data)) {
      formCode += `    await page.fill('${step.selector} input[name="${fieldName}"], ${step.selector} input[id="${fieldName}"]', '${fieldValue}');
`;
    }
    
    // Submit form
    formCode += `    await page.click('${step.selector} button[type="submit"], ${step.selector} input[type="submit"]');
    await page.waitForTimeout(1000); // Wait for form submission
`;
    
    return formCode;
  }
}

async function main() {
  try {
    // Read crawl output
    const crawlOutputPath = path.join(process.cwd(), 'crawl-output.json');
    
    if (!fs.existsSync(crawlOutputPath)) {
      console.error('❌ crawl-output.json not found. Run "pnpm crawl" first.');
      process.exit(1);
    }

    const crawlData: CrawlResult = JSON.parse(fs.readFileSync(crawlOutputPath, 'utf8'));
    
    if (!crawlData.journeys || crawlData.journeys.length === 0) {
      console.error('❌ No journeys found in crawl output.');
      process.exit(1);
    }

    // Generate tests
    const generator = new TestGenerator(crawlData);
    generator.generateTests();

    console.log('\n🎯 Next steps:');
    console.log('   1. Review generated tests in tests/generated.spec.ts');
    console.log('   2. Run tests with: pnpm test:e2e');
    console.log('   3. Tests include accessibility checks with axe-core');

  } catch (error) {
    console.error('❌ Error generating tests:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { TestGenerator, type JourneyStep, type CrawlResult };
