import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

class SiteCrawler {
  constructor(baseUrl = 'http://localhost:3000', maxDepth = 2) {
    this.baseUrl = baseUrl;
    this.maxDepth = maxDepth;
    this.visitedUrls = new Set();
    this.journeys = [];
    this.currentJourney = [];
    this.ignoredSelectors = [
      'script', 'style', 'noscript', 'meta', 'link',
      '[aria-hidden="true"]', '[hidden]', '[style*="display: none"]',
      '.sr-only', '.visually-hidden', '[role="presentation"]'
    ];
  }

  async crawl() {
    console.log(`🚀 Starting crawl of ${this.baseUrl} with max depth ${this.maxDepth}`);
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Start with homepage
      await this.crawlPage(page, this.baseUrl, 0);
      
      // Generate additional journeys from discovered elements
      await this.generateJourneysFromElements(page);
      
      // Filter and optimize journeys
      this.optimizeJourneys();
      
    } finally {
      await browser.close();
    }

    const result = {
      baseUrl: this.baseUrl,
      timestamp: new Date().toISOString(),
      journeys: this.journeys,
      totalSteps: this.journeys.reduce((sum, journey) => sum + journey.length, 0),
      totalJourneys: this.journeys.length,
      crawlStats: {
        totalPagesVisited: this.visitedUrls.size,
        totalElementsDiscovered: this.currentJourney.length,
        filteredElements: this.currentJourney.filter(step => step.quality === 'high').length
      }
    };

    console.log(`✅ Crawl complete! Found ${result.totalJourneys} optimized journeys with ${result.totalSteps} total steps`);
    return result;
  }

  async crawlPage(page, url, depth) {
    if (depth > this.maxDepth || this.visitedUrls.has(url)) {
      return;
    }

    console.log(`📄 Crawling ${url} at depth ${depth}`);
    this.visitedUrls.add(url);

    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000); // Wait for dynamic content

      // Record page visit
      this.currentJourney.push({
        type: 'visit',
        url,
        depth,
        quality: 'high'
      });

      // Discover interactive elements with quality scoring
      const links = await this.discoverLinks(page, depth);
      const buttons = await this.discoverButtons(page, depth);
      const forms = await this.discoverForms(page, depth);

      // Add discovered elements to current journey
      this.currentJourney.push(...links, ...buttons, ...forms);

      // Follow links if within depth limit
      if (depth < this.maxDepth) {
        for (const link of links) {
          if (link.url && !this.visitedUrls.has(link.url) && link.quality === 'high') {
            await this.crawlPage(page, link.url, depth + 1);
          }
        }
      }

    } catch (error) {
      console.error(`❌ Error crawling ${url}:`, error);
    }
  }

  async discoverLinks(page, depth) {
    const links = await page.$$('a[href]');
    const steps = [];

    for (const link of links) {
      try {
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        const isVisible = await link.isVisible();
        const ariaHidden = await link.getAttribute('aria-hidden');
        const role = await link.getAttribute('role');

        // Skip non-interactive or hidden links
        if (ariaHidden === 'true' || role === 'presentation') continue;

        if (href && isVisible && text?.trim()) {
          const fullUrl = href.startsWith('http') ? href : new URL(href, this.baseUrl).href;
          
          // Only include internal links and relative paths
          if (fullUrl.startsWith(this.baseUrl) || href.startsWith('/')) {
            // Quality scoring based on link characteristics
            let quality = 'medium';
            if (href.startsWith('/') && text.trim().length > 2 && text.trim().length < 50) {
              quality = 'high';
            } else if (href.includes('#') || href.includes('javascript:')) {
              quality = 'low';
            }

            steps.push({
              type: 'click',
              url: fullUrl,
              selector: `a[href="${href}"]`,
              text: text.trim(),
              depth,
              quality
            });
          }
        }
      } catch (error) {
        // Skip problematic links
      }
    }

    return steps;
  }

  async discoverButtons(page, depth) {
    const buttons = await page.$$('button, [role="button"], input[type="submit"], input[type="button"]');
    const steps = [];

    for (const button of buttons) {
      try {
        const text = await button.textContent();
        const isVisible = await button.isVisible();
        const isDisabled = await button.isDisabled();
        const tagName = await button.evaluate(el => el.tagName.toLowerCase());
        const type = await button.getAttribute('type');
        const ariaHidden = await button.getAttribute('aria-hidden');

        // Skip disabled or hidden buttons
        if (isDisabled || ariaHidden === 'true') continue;

        if (isVisible && text?.trim()) {
          let selector = '';
          if (tagName === 'button') {
            selector = `button:has-text("${text.trim()}")`;
          } else if (tagName === 'input') {
            selector = `input[type="${type}"]:has-text("${text.trim()}")`;
          }

          if (selector) {
            // Quality scoring for buttons
            let quality = 'medium';
            if (text.trim().length > 2 && text.trim().length < 30 && !text.includes('Loading')) {
              quality = 'high';
            } else if (text.includes('Loading') || text.includes('...')) {
              quality = 'low';
            }

            steps.push({
              type: 'click',
              selector,
              text: text.trim(),
              depth,
              quality
            });
          }
        }
      } catch (error) {
        // Skip problematic buttons
      }
    }

    return steps;
  }

  async discoverForms(page, depth) {
    const forms = await page.$$('form');
    const steps = [];

    for (const form of forms) {
      try {
        const inputs = await form.$$('input[type="email"], input[type="password"], input[type="text"]');
        const submitButton = await form.$('button[type="submit"], input[type="submit"]');
        
        if (inputs.length > 0 && submitButton) {
          const formData = {};
          
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
            depth,
            quality: 'high' // Forms are always high quality
          });
        }
      } catch (error) {
        // Skip problematic forms
      }
    }

    return steps;
  }

  async generateFormSelector(form) {
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

  async generateJourneysFromElements(page) {
    // Create journeys from discovered elements
    const allSteps = this.currentJourney;
    
    // Group steps by depth to create logical journeys
    const stepsByDepth = new Map();
    
    for (const step of allSteps) {
      if (!stepsByDepth.has(step.depth)) {
        stepsByDepth.set(step.depth, []);
      }
      stepsByDepth.get(step.depth).push(step);
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

  createFocusedJourneys(allSteps) {
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

    // Critical user flows
    const criticalSteps = allSteps.filter(step => 
      step.quality === 'high' && 
      (step.text && /book|appointment|service|start|get.*started/i.test(step.text))
    );
    if (criticalSteps.length > 0) {
      this.journeys.push(criticalSteps);
    }
  }

  optimizeJourneys() {
    // Remove duplicate journeys
    const uniqueJourneys = [];
    const seenJourneys = new Set();

    for (const journey of this.journeys) {
      const journeyKey = journey.map(step => `${step.type}:${step.url || step.selector || step.text}`).join('|');
      if (!seenJourneys.has(journeyKey)) {
        seenJourneys.add(journeyKey);
        uniqueJourneys.push(journey);
      }
    }

    // Filter out low-quality journeys
    const highQualityJourneys = uniqueJourneys.filter(journey => {
      const highQualitySteps = journey.filter(step => step.quality === 'high');
      return highQualitySteps.length >= 2; // At least 2 high-quality steps
    });

    // Sort journeys by quality and length
    this.journeys = highQualityJourneys.sort((a, b) => {
      const aQuality = a.filter(step => step.quality === 'high').length;
      const bQuality = b.filter(step => step.quality === 'high').length;
      if (aQuality !== bQuality) return bQuality - aQuality;
      return b.length - a.length;
    });

    console.log(`🔧 Optimized journeys: ${uniqueJourneys.length} → ${this.journeys.length} high-quality journeys`);
  }
}

async function main() {
  console.log('🚀 Starting main function...');
  
  try {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const maxDepth = parseInt(process.env.MAX_DEPTH || '2');
    
    console.log(`📋 Configuration: baseUrl=${baseUrl}, maxDepth=${maxDepth}`);
    
    const crawler = new SiteCrawler(baseUrl, maxDepth);
    console.log('🔧 Crawler created, starting crawl...');
    
    const result = await crawler.crawl();
    console.log('✅ Crawl completed, processing result...');

    // Save results
    const outputPath = path.join(process.cwd(), 'crawl-output.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    
    console.log(`💾 Results saved to ${outputPath}`);
    console.log(`📊 Summary:`);
    console.log(`   - Base URL: ${result.baseUrl}`);
    console.log(`   - Total Journeys: ${result.totalJourneys}`);
    console.log(`   - Total Steps: ${result.totalSteps}`);
    console.log(`   - Max Depth: ${maxDepth}`);
    console.log(`   - Pages Visited: ${result.crawlStats.totalPagesVisited}`);
    console.log(`   - High Quality Elements: ${result.crawlStats.filteredElements}`);
    
    // Show sample journeys
    console.log(`\n🔍 Sample Journeys:`);
    result.journeys.slice(0, 3).forEach((journey, index) => {
      console.log(`\n   Journey ${index + 1} (${journey.length} steps, Quality: ${journey.filter(s => s.quality === 'high').length}/${journey.length}):`);
      journey.forEach(step => {
        const stepInfo = step.type === 'visit' ? `Visit ${step.url}` :
                        step.type === 'click' ? `Click "${step.text}"` :
                        `Fill form with ${Object.keys(step.data || {}).length} fields`;
        console.log(`     ${stepInfo} [${step.quality}]`);
      });
    });
  } catch (error) {
    console.error('❌ Error in main function:', error);
    process.exit(1);
  }
}

// Check if this script is being run directly
const scriptPath = process.argv[1];
const currentScriptPath = import.meta.url.replace('file:///', '').replace(/\\/g, '/');
const isMainModule = scriptPath && (scriptPath.includes('crawl-site.mjs') || currentScriptPath.includes('crawl-site.mjs'));

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

export { SiteCrawler };
