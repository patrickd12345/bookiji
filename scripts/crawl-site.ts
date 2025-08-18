import { chromium, type Page, type ElementHandle } from '@playwright/test';
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

class SiteCrawler {
  private baseUrl: string;
  private maxDepth: number;
  private visitedUrls: Set<string> = new Set();
  private journeys: JourneyStep[][] = [];
  private currentJourney: JourneyStep[] = [];

  constructor(baseUrl: string = 'http://localhost:3000', maxDepth: number = 2) {
    this.baseUrl = baseUrl;
    this.maxDepth = maxDepth;
  }

  async crawl(): Promise<CrawlResult> {
    console.log(`🚀 Starting crawl of ${this.baseUrl} with max depth ${this.maxDepth}`);
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Start with homepage
      await this.crawlPage(page, this.baseUrl, 0);
      
      // Generate additional journeys from discovered elements
      await this.generateJourneysFromElements(page);
      
    } finally {
      await browser.close();
    }

    const result: CrawlResult = {
      baseUrl: this.baseUrl,
      timestamp: new Date().toISOString(),
      journeys: this.journeys,
      totalSteps: this.journeys.reduce((sum, journey) => sum + journey.length, 0),
      totalJourneys: this.journeys.length
    };

    console.log(`✅ Crawl complete! Found ${result.totalJourneys} journeys with ${result.totalSteps} total steps`);
    return result;
  }

  private async crawlPage(page: Page, url: string, depth: number): Promise<void> {
    if (depth > this.maxDepth || this.visitedUrls.has(url)) {
      return;
    }

    console.log(`📄 Crawling ${url} at depth ${depth}`);
    this.visitedUrls.add(url);

    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000); // Wait for dynamic content

      // Record page visit
      this.currentJourney.push({
        type: 'visit',
        url,
        depth
      });

      // Discover interactive elements
      const links = await this.discoverLinks(page, depth);
      const buttons = await this.discoverButtons(page, depth);
      const forms = await this.discoverForms(page, depth);

      // Add discovered elements to current journey
      this.currentJourney.push(...links, ...buttons, ...forms);

      // Follow links if within depth limit
      if (depth < this.maxDepth) {
        for (const link of links) {
          if (link.url && !this.visitedUrls.has(link.url)) {
            await this.crawlPage(page, link.url, depth + 1);
          }
        }
      }

    } catch (error) {
      console.error(`❌ Error crawling ${url}:`, error);
    }
  }

  private async discoverLinks(page: Page, depth: number): Promise<JourneyStep[]> {
    const links = await page.$$('a[href]');
    const steps: JourneyStep[] = [];

    for (const link of links) {
      try {
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        const isVisible = await link.isVisible();

        if (href && isVisible && text?.trim()) {
          const fullUrl = href.startsWith('http') ? href : new URL(href, this.baseUrl).href;
          
          // Only include internal links and relative paths
          if (fullUrl.startsWith(this.baseUrl) || href.startsWith('/')) {
            steps.push({
              type: 'click',
              url: fullUrl,
              selector: `a[href="${href}"]`,
              text: text.trim(),
              depth
            });
          }
        }
      } catch (error) {
        // Skip problematic links
      }
    }

    return steps;
  }

  private async discoverButtons(page: Page, depth: number): Promise<JourneyStep[]> {
    const buttons = await page.$$('button, [role="button"], input[type="submit"], input[type="button"]');
    const steps: JourneyStep[] = [];

    for (const button of buttons) {
      try {
        const text = await button.textContent();
        const isVisible = await button.isVisible();
        const tagName = await button.evaluate(el => el.tagName.toLowerCase());
        const type = await button.getAttribute('type');

        if (isVisible && text?.trim()) {
          let selector = '';
          if (tagName === 'button') {
            selector = `button:has-text("${text.trim()}")`;
          } else if (tagName === 'input') {
            selector = `input[type="${type}"]:has-text("${text.trim()}")`;
          }

          if (selector) {
            steps.push({
              type: 'click',
              selector,
              text: text.trim(),
              depth
            });
          }
        }
      } catch (error) {
        // Skip problematic buttons
      }
    }

    return steps;
  }

  private async discoverForms(page: Page, depth: number): Promise<JourneyStep[]> {
    const forms = await page.$$('form');
    const steps: JourneyStep[] = [];

    for (const form of forms) {
      try {
        const inputs = await form.$$('input[type="email"], input[type="password"], input[type="text"]');
        const submitButton = await form.$('button[type="submit"], input[type="submit"]');
        
        if (inputs.length > 0 && submitButton) {
          const formData: Record<string, string> = {};
          
          for (const input of inputs) {
            const type = await input.getAttribute('type');
            const name = await input.getAttribute('name') || await input.getAttribute('id') || 'input';
            
            if (type === 'email') {
              formData[name] = 'test@example.com';
            } else if (type === 'password') {
              formData[name] = 'Password123!';
            } else {
              formData[name] = 'Test User';
            }
          }

          const formSelector = await this.generateFormSelector(form);
          
          steps.push({
            type: 'form',
            selector: formSelector,
            data: formData,
            depth
          });
        }
      } catch (error) {
        // Skip problematic forms
      }
    }

    return steps;
  }

  private async generateFormSelector(form: ElementHandle<Element>): Promise<string> {
    try {
      const id = await form.getAttribute('id');
      if (id) return `form#${id}`;
      
      const action = await form.getAttribute('action');
      if (action) return `form[action="${action}"]`;
      
      // Fallback to generic form selector
      return 'form';
    } catch {
      return 'form';
    }
  }

  private async generateJourneysFromElements(page: Page): Promise<void> {
    // Create journeys from discovered elements
    const allSteps = this.currentJourney;
    
    // Group steps by depth to create logical journeys
    const stepsByDepth = new Map<number, JourneyStep[]>();
    
    for (const step of allSteps) {
      if (!stepsByDepth.has(step.depth)) {
        stepsByDepth.set(step.depth, []);
      }
      stepsByDepth.get(step.depth)!.push(step);
    }

    // Create journeys starting from each depth level
    for (const [depth, steps] of stepsByDepth) {
      if (depth === 0) {
        // Homepage journey
        this.journeys.push([...steps]);
      } else {
        // Create journey from this depth
        const journey = steps.filter(step => step.depth <= depth);
        if (journey.length > 0) {
          this.journeys.push(journey);
        }
      }
    }

    // Create focused journeys for specific user flows
    this.createFocusedJourneys(allSteps);
  }

  private createFocusedJourneys(allSteps: JourneyStep[]): void {
    // Authentication flow
    const authSteps = allSteps.filter(step => 
      step.type === 'form' || 
      (step.text && /login|sign|register|auth/i.test(step.text))
    );
    if (authSteps.length > 0) {
      this.journeys.push(authSteps);
    }

    // Navigation flow
    const navSteps = allSteps.filter(step => 
      step.type === 'click' && 
      step.text && /home|about|help|contact|faq/i.test(step.text)
    );
    if (navSteps.length > 0) {
      this.journeys.push(navSteps);
    }

    // Form submission flow
    const formSteps = allSteps.filter(step => step.type === 'form');
    if (formSteps.length > 0) {
      this.journeys.push(formSteps);
    }
  }
}

async function main() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const maxDepth = parseInt(process.env.MAX_DEPTH || '2');
  
  const crawler = new SiteCrawler(baseUrl, maxDepth);
  const result = await crawler.crawl();

  // Save results
  const outputPath = path.join(process.cwd(), 'crawl-output.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  
  console.log(`💾 Results saved to ${outputPath}`);
  console.log(`📊 Summary:`);
  console.log(`   - Base URL: ${result.baseUrl}`);
  console.log(`   - Total Journeys: ${result.totalJourneys}`);
  console.log(`   - Total Steps: ${result.totalSteps}`);
  console.log(`   - Max Depth: ${maxDepth}`);
  
  // Show sample journeys
  console.log(`\n🔍 Sample Journeys:`);
  result.journeys.slice(0, 3).forEach((journey, index) => {
    console.log(`\n   Journey ${index + 1} (${journey.length} steps):`);
    journey.forEach(step => {
      const stepInfo = step.type === 'visit' ? `Visit ${step.url}` :
                      step.type === 'click' ? `Click "${step.text}"` :
                      `Fill form with ${Object.keys(step.data || {}).length} fields`;
      console.log(`     ${stepInfo}`);
    });
  });
}

if (require.main === module) {
  main().catch(console.error);
}

export { SiteCrawler, type JourneyStep, type CrawlResult };
