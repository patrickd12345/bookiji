#!/usr/bin/env node

// 🏷️ Chaos Taxonomy - Classify and Track Resilience Failure Patterns
// Usage: node scripts/chaos-taxonomy.mjs analyze playwright-report/

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const FAILURE_PATTERNS = {
  'offline-missing': {
    keywords: ['offline', 'connection', 'network unavailable', 'ERR_INTERNET_DISCONNECTED'],
    severity: 'high',
    category: 'resilience',
    description: 'Missing offline UI or network status indicators'
  },
  'retry-loop': {
    keywords: ['disabled', 'stuck', 'never re-enable', 'timeout exceeded', 'not enabled'],
    severity: 'medium', 
    category: 'ux',
    description: 'UI elements stuck in disabled/loading state without retry mechanism'
  },
  'critical-route': {
    keywords: ['payment', 'booking', 'auth', 'checkout', 'blank', 'no title'],
    severity: 'critical',
    category: 'business',
    description: 'Critical business flows completely broken under network stress'
  },
  'a11y-regression': {
    keywords: ['aria-label', 'screen reader', 'wcag', 'accessibility', 'critical violations'],
    severity: 'high',
    category: 'accessibility', 
    description: 'Accessibility compliance breaks under failure conditions'
  },
  'error-boundary': {
    keywords: ['blank screen', 'empty title', 'no content', 'white screen'],
    severity: 'high',
    category: 'stability',
    description: 'Missing error boundaries leading to blank screens'
  },
  'loading-state': {
    keywords: ['loading theme', 'spinner', 'loader', 'pending'],
    severity: 'low',
    category: 'polish',
    description: 'Loading states that never resolve to final state'
  }
};

function analyzeChaosResults(reportDir) {
  console.log('🏷️ Analyzing chaos test results for failure patterns...');
  
  const results = {
    timestamp: new Date().toISOString(),
    totalTests: 0,
    failedTests: 0,
    patterns: {},
    recommendations: [],
    contractViolations: []
  };
  
  // Initialize pattern counters
  Object.keys(FAILURE_PATTERNS).forEach(pattern => {
    results.patterns[pattern] = {
      count: 0,
      tests: [],
      ...FAILURE_PATTERNS[pattern]
    };
  });
  
  // Look for Playwright test results
  const testResultsPath = join(reportDir, 'results.json');
  const reportPath = join(reportDir, 'index.html');
  
  let testData = null;
  
  if (existsSync(testResultsPath)) {
    try {
      testData = JSON.parse(readFileSync(testResultsPath, 'utf8'));
    } catch (err) {
      console.log('Could not parse results.json, checking HTML report...');
    }
  }
  
  if (existsSync(reportPath)) {
    try {
      const htmlContent = readFileSync(reportPath, 'utf8');
      analyzeHtmlReport(htmlContent, results);
    } catch (err) {
      console.log('Could not read HTML report:', err.message);
    }
  }
  
  // Analyze test output from terminal/logs if available
  if (process.argv[3]) {
    const logContent = readFileSync(process.argv[3], 'utf8');
    analyzeLogOutput(logContent, results);
  }
  
  generateRecommendations(results);
  
  return results;
}

function analyzeHtmlReport(htmlContent, results) {
  console.log('📊 Analyzing HTML report...');
  
  // Extract failed test information from HTML
  const failedTestRegex = /class="[^"]*failed[^"]*"[^>]*>([^<]+)</g;
  const errorRegex = /Error: ([^<\n]+)/g;
  
  let match;
  while ((match = failedTestRegex.exec(htmlContent)) !== null) {
    results.failedTests++;
    const testName = match[1];
    
    // Check for error details
    const errorMatch = errorRegex.exec(htmlContent);
    const errorText = errorMatch ? errorMatch[1] : '';
    
    classifyFailure(testName, errorText, results);
  }
  
  // Count total tests
  const totalTestRegex = /class="[^"]*test[^"]*"/g;
  const totalMatches = htmlContent.match(totalTestRegex);
  results.totalTests = totalMatches ? totalMatches.length : 0;
}

function analyzeLogOutput(logContent, results) {
  console.log('📝 Analyzing log output...');
  
  const lines = logContent.split('\n');
  let currentTest = '';
  
  for (const line of lines) {
    // Detect test starts
    if (line.includes('›') && line.includes('@')) {
      currentTest = line;
      results.totalTests++;
    }
    
    // Detect failures
    if (line.includes('Error:') || line.includes('failed')) {
      results.failedTests++;
      classifyFailure(currentTest, line, results);
    }
  }
}

function classifyFailure(testName, errorText, results) {
  const fullText = `${testName} ${errorText}`.toLowerCase();
  
  for (const [patternName, pattern] of Object.entries(FAILURE_PATTERNS)) {
    if (pattern.keywords.some(keyword => fullText.includes(keyword.toLowerCase()))) {
      results.patterns[patternName].count++;
      results.patterns[patternName].tests.push({
        name: testName.trim(),
        error: errorText.trim()
      });
      
      console.log(`🏷️ Classified: ${patternName} - ${testName.substring(0, 50)}...`);
    }
  }
  
  // Check for contract violations
  if (testName.includes('@contract')) {
    results.contractViolations.push({
      contract: testName,
      violation: errorText
    });
  }
}

function generateRecommendations(results) {
  console.log('💡 Generating recommendations...');
  
  const { patterns } = results;
  
  if (patterns['offline-missing'].count > 0) {
    results.recommendations.push({
      priority: 'high',
      pattern: 'offline-missing',
      action: 'Implement network status detection and offline UI components',
      implementation: 'Add navigator.onLine listeners and offline banners with retry mechanisms'
    });
  }
  
  if (patterns['retry-loop'].count > 0) {
    results.recommendations.push({
      priority: 'medium',
      pattern: 'retry-loop', 
      action: 'Add timeout and retry logic to disabled UI elements',
      implementation: 'Implement button re-enabling after 5s timeout or explicit retry affordances'
    });
  }
  
  if (patterns['critical-route'].count > 0) {
    results.recommendations.push({
      priority: 'critical',
      pattern: 'critical-route',
      action: 'Harden critical business flows with error boundaries and fallbacks',
      implementation: 'Add React error boundaries and graceful degradation for payment/booking flows'
    });
  }
  
  if (patterns['a11y-regression'].count > 0) {
    results.recommendations.push({
      priority: 'high',
      pattern: 'a11y-regression',
      action: 'Ensure error states maintain WCAG compliance',
      implementation: 'Add aria-live regions and proper labeling to error/loading states'
    });
  }
  
  if (patterns['error-boundary'].count > 0) {
    results.recommendations.push({
      priority: 'high',
      pattern: 'error-boundary',
      action: 'Implement React error boundaries for all route components',
      implementation: 'Add error boundary components with retry mechanisms for each major route'
    });
  }
}

function generateReport(results) {
  const reportHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>🌪️ Chaos Taxonomy Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .metric { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 2em; font-weight: bold; color: #6c757d; }
    .pattern { margin: 20px 0; padding: 15px; border-left: 4px solid #007bff; background: #f8f9fa; }
    .critical { border-left-color: #dc3545; }
    .high { border-left-color: #fd7e14; }
    .medium { border-left-color: #ffc107; }
    .low { border-left-color: #28a745; }
    .recommendations { background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .contract-violation { background: #ffe6e6; padding: 10px; margin: 10px 0; border-radius: 4px; }
    ul { margin: 10px 0; }
    code { background: #f1f3f4; padding: 2px 6px; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🌪️ Chaos Taxonomy Report</h1>
    <p>Generated: ${results.timestamp}</p>
    <p>Resilience Pattern Analysis</p>
  </div>

  <div class="summary">
    <div class="metric">
      <div class="metric-value">${results.totalTests}</div>
      <div>Total Tests</div>
    </div>
    <div class="metric">
      <div class="metric-value">${results.failedTests}</div>
      <div>Failed Tests</div>
    </div>
    <div class="metric">
      <div class="metric-value">${Math.round((results.totalTests - results.failedTests) / results.totalTests * 100) || 0}%</div>
      <div>Resilience Score</div>
    </div>
    <div class="metric">
      <div class="metric-value">${Object.values(results.patterns).reduce((sum, p) => sum + p.count, 0)}</div>
      <div>Pattern Matches</div>
    </div>
  </div>

  <h2>🏷️ Failure Pattern Analysis</h2>
  ${Object.entries(results.patterns)
    .filter(([_, pattern]) => pattern.count > 0)
    .map(([name, pattern]) => `
    <div class="pattern ${pattern.severity}">
      <h3>${name.replace(/-/g, ' ').toUpperCase()} (${pattern.count} occurrences)</h3>
      <p><strong>Category:</strong> ${pattern.category}</p>
      <p><strong>Severity:</strong> ${pattern.severity}</p>
      <p>${pattern.description}</p>
      ${pattern.tests.length > 0 ? `
        <details>
          <summary>Failed Tests (${pattern.tests.length})</summary>
          <ul>
            ${pattern.tests.map(test => `<li><code>${test.name}</code><br/><small>${test.error}</small></li>`).join('')}
          </ul>
        </details>
      ` : ''}
    </div>
  `).join('')}

  ${results.contractViolations.length > 0 ? `
    <h2>⚖️ UX Contract Violations</h2>
    ${results.contractViolations.map(violation => `
      <div class="contract-violation">
        <strong>Contract:</strong> ${violation.contract}<br/>
        <strong>Violation:</strong> ${violation.violation}
      </div>
    `).join('')}
  ` : ''}

  <div class="recommendations">
    <h2>💡 Recommendations</h2>
    ${results.recommendations.length > 0 ? results.recommendations.map(rec => `
      <div style="margin: 15px 0;">
        <h4>🎯 ${rec.action} <span style="color: ${rec.priority === 'critical' ? '#dc3545' : rec.priority === 'high' ? '#fd7e14' : '#ffc107'};">[${rec.priority.toUpperCase()}]</span></h4>
        <p><strong>Pattern:</strong> ${rec.pattern}</p>
        <p><strong>Implementation:</strong> ${rec.implementation}</p>
      </div>
    `).join('') : '<p>🎉 No recommendations - all patterns handled gracefully!</p>'}
  </div>

  <h2>📊 Next Steps</h2>
  <ol>
    <li>Address critical and high priority patterns first</li>
    <li>Implement UX contracts as permanent guards</li>
    <li>Run chaos tests nightly to track improvement</li>
    <li>Update this taxonomy as new patterns emerge</li>
  </ol>
</body>
</html>`;

  return reportHtml;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const reportDir = process.argv[2] || 'playwright-report';
  
  if (!existsSync(reportDir)) {
    console.error(`Report directory ${reportDir} not found`);
    process.exit(1);
  }
  
  const results = analyzeChaosResults(reportDir);
  
  // Write JSON results
  writeFileSync('chaos-taxonomy.json', JSON.stringify(results, null, 2));
  console.log('📄 JSON results written to chaos-taxonomy.json');
  
  // Write HTML report
  const htmlReport = generateReport(results);
  writeFileSync('chaos-taxonomy-report.html', htmlReport);
  console.log('📊 HTML report written to chaos-taxonomy-report.html');
  
  // Print summary
  console.log('\n🌪️ CHAOS TAXONOMY SUMMARY');
  console.log('=' .repeat(50));
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`Failed Tests: ${results.failedTests}`);
  console.log(`Resilience Score: ${Math.round((results.totalTests - results.failedTests) / results.totalTests * 100) || 0}%`);
  console.log(`\nTop Failure Patterns:`);
  
  Object.entries(results.patterns)
    .filter(([_, pattern]) => pattern.count > 0)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([name, pattern]) => {
      console.log(`  ${name}: ${pattern.count} (${pattern.severity})`);
    });
    
  console.log(`\nRecommendations: ${results.recommendations.length}`);
  console.log(`Contract Violations: ${results.contractViolations.length}`);
}
