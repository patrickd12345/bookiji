#!/usr/bin/env node

/**
 * Quality Badge Generator
 * 
 * This script generates comprehensive quality badges for the README,
 * showing the current status of tests, accessibility, audits, coverage, and performance.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Badge configuration
const BADGE_CONFIG = {
  // Test status badges
  tests: {
    passing: 'https://img.shields.io/badge/tests-passing-brightgreen',
    failing: 'https://img.shields.io/badge/tests-failing-red',
    partial: 'https://img.shields.io/badge/tests-partial-yellow'
  },
  
  // Accessibility badges
  a11y: {
    excellent: 'https://img.shields.io/badge/a11y-excellent-brightgreen',
    good: 'https://img.shields.io/badge/a11y-good-green',
    needs_work: 'https://img.shields.io/badge/a11y-needs%20work-yellow',
    poor: 'https://img.shields.io/badge/a11y-poor-red'
  },
  
  // Performance badges
  performance: {
    excellent: 'https://img.shields.io/badge/performance-excellent-brightgreen',
    good: 'https://img.shields.io/badge/performance-good-green',
    needs_work: 'https://img.shields.io/badge/performance-needs%20work-yellow',
    poor: 'https://img.shields.io/badge/performance-poor-red'
  },
  
  // Code quality badges
  quality: {
    excellent: 'https://img.shields.io/badge/quality-excellent-brightgreen',
    good: 'https://img.shields.io/badge/quality-good-green',
    needs_work: 'https://img.shields.io/badge/quality-needs%20work-yellow',
    poor: 'https://img.shields.io/badge/quality-poor-red'
  },
  
  // Coverage badges
  coverage: {
    excellent: 'https://img.shields.io/badge/coverage-90%25%2B-brightgreen',
    good: 'https://img.shields.io/badge/coverage-70%25%2B-green',
    needs_work: 'https://img.shields.io/badge/coverage-50%25%2B-yellow',
    poor: 'https://img.shields.io/badge/coverage-50%25-red'
  }
};

// Run command and return result
const runCommand = (command, defaultValue = '0') => {
  try {
    const result = execSync(command, { 
      cwd: PROJECT_ROOT, 
      encoding: 'utf8',
      timeout: 30000 
    });
    return result.trim() || defaultValue;
  } catch (error) {
    console.warn(`⚠️ Command failed: ${command}`);
    return defaultValue;
  }
};

// Get test status
const getTestStatus = () => {
  try {
    // Run tests and capture output
    const testOutput = execSync('pnpm vitest run --reporter=verbose', { 
      cwd: PROJECT_ROOT, 
      encoding: 'utf8',
      timeout: 120000 
    });
    
    // Parse test results
    const lines = testOutput.split('\n');
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    
    for (const line of lines) {
      if (line.includes('✓') || line.includes('PASS')) {
        passedTests++;
        totalTests++;
      } else if (line.includes('✗') || line.includes('FAIL')) {
        failedTests++;
        totalTests++;
      } else if (line.includes('Tests') && line.includes('passed')) {
        // Extract numbers from summary line
        const match = line.match(/(\d+)\s+passed/);
        if (match) passedTests = parseInt(match[1]);
      }
    }
    
    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      status: failedTests === 0 ? 'passing' : failedTests < totalTests * 0.1 ? 'partial' : 'failing'
    };
  } catch (error) {
    console.warn('Failed to run tests:', error.message);
    return { total: 0, passed: 0, failed: 0, status: 'unknown' };
  }
};

// Get accessibility status
const getA11yStatus = () => {
  try {
    // Check if a11y artifacts exist from recent runs
    const a11yDir = join(PROJECT_ROOT, 'test-results', 'a11y-artifacts');
    
    if (!existsSync(a11yDir)) {
      return { status: 'unknown', violations: 0, critical: 0 };
    }
    
    // Look for recent JSON reports
    const jsonFiles = execSync('find test-results/a11y-artifacts -name "*.json" -mtime -1', { 
      cwd: PROJECT_ROOT, 
      encoding: 'utf8' 
    }).trim().split('\n').filter(f => f);
    
    if (jsonFiles.length === 0) {
      return { status: 'unknown', violations: 0, critical: 0 };
    }
    
    let totalViolations = 0;
    let criticalViolations = 0;
    
    for (const file of jsonFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const data = JSON.parse(content);
        
        if (data.violations) {
          totalViolations += data.violations.length;
          
          // Count critical violations
          data.violations.forEach(violation => {
            if (violation.impact === 'critical') {
              criticalViolations += violation.nodes?.length || 1;
            }
          });
        }
      } catch (e) {
        console.warn(`Failed to parse ${file}:`, e.message);
      }
    }
    
    let status = 'excellent';
    if (criticalViolations > 0) status = 'poor';
    else if (totalViolations > 10) status = 'needs_work';
    else if (totalViolations > 0) status = 'good';
    
    return { status, violations: totalViolations, critical: criticalViolations };
  } catch (error) {
    console.warn('Failed to get a11y status:', error.message);
    return { status: 'unknown', violations: 0, critical: 0 };
  }
};

// Get performance status
const getPerformanceStatus = () => {
  try {
    // Check if performance traces exist from recent runs
    const perfDir = join(PROJECT_ROOT, 'test-results', 'performance-traces');
    
    if (!existsSync(perfDir)) {
      return { status: 'unknown', traces: 0 };
    }
    
    // Count recent performance traces
    const traceFiles = execSync('find test-results/performance-traces -name "*.zip" -mtime -1', { 
      cwd: PROJECT_ROOT, 
      encoding: 'utf8' 
    }).trim().split('\n').filter(f => f);
    
    const traceCount = traceFiles.length;
    
    let status = 'excellent';
    if (traceCount === 0) status = 'unknown';
    else if (traceCount < 3) status = 'needs_work';
    else if (traceCount < 5) status = 'good';
    
    return { status, traces: traceCount };
  } catch (error) {
    console.warn('Failed to get performance status:', error.message);
    return { status: 'unknown', traces: 0 };
  }
};

// Get code quality status
const getQualityStatus = () => {
  try {
    // Run linting
    const lintOutput = execSync('pnpm lint 2>&1', { 
      cwd: PROJECT_ROOT, 
      encoding: 'utf8',
      timeout: 60000 
    });
    
    // Count warnings and errors
    const warningCount = (lintOutput.match(/warning/gi) || []).length;
    const errorCount = (lintOutput.match(/error/gi) || []).length;
    const totalIssues = warningCount + errorCount;
    
    let status = 'excellent';
    if (errorCount > 0) status = 'poor';
    else if (totalIssues > 20) status = 'needs_work';
    else if (totalIssues > 5) status = 'good';
    
    return { status, warnings: warningCount, errors: errorCount, total: totalIssues };
  } catch (error) {
    console.warn('Failed to get quality status:', error.message);
    return { status: 'unknown', warnings: 0, errors: 0, total: 0 };
  }
};

// Get coverage status
const getCoverageStatus = () => {
  try {
    // Check if coverage report exists
    const coverageFile = join(PROJECT_ROOT, 'coverage', 'coverage-summary.json');
    
    if (!existsSync(coverageFile)) {
      return { status: 'unknown', percentage: 0 };
    }
    
    const coverageData = JSON.parse(readFileSync(coverageFile, 'utf8'));
    const totalCoverage = coverageData.total?.lines?.pct || 0;
    
    let status = 'excellent';
    if (totalCoverage < 50) status = 'poor';
    else if (totalCoverage < 70) status = 'needs_work';
    else if (totalCoverage < 90) status = 'good';
    
    return { status, percentage: totalCoverage };
  } catch (error) {
    console.warn('Failed to get coverage status:', error.message);
    return { status: 'unknown', percentage: 0 };
  }
};

// Generate badge URLs
const generateBadges = (statuses) => {
  const badges = [];
  
  // Test status badge
  const testBadge = BADGE_CONFIG.tests[statuses.tests.status] || BADGE_CONFIG.tests.failing;
  badges.push(`![Tests](${testBadge})`);
  
  // Accessibility badge
  const a11yBadge = BADGE_CONFIG.a11y[statuses.a11y.status] || BADGE_CONFIG.a11y.needs_work;
  badges.push(`![Accessibility](${a11yBadge})`);
  
  // Performance badge
  const perfBadge = BADGE_CONFIG.performance[statuses.performance.status] || BADGE_CONFIG.performance.needs_work;
  badges.push(`![Performance](${perfBadge})`);
  
  // Code quality badge
  const qualityBadge = BADGE_CONFIG.quality[statuses.quality.status] || BADGE_CONFIG.quality.needs_work;
  badges.push(`![Code Quality](${qualityBadge})`);
  
  // Coverage badge
  const coverageBadge = BADGE_CONFIG.coverage[statuses.coverage.status] || BADGE_CONFIG.coverage.needs_work;
  badges.push(`![Coverage](${coverageBadge})`);
  
  return badges;
};

// Generate detailed status report
const generateStatusReport = (statuses) => {
  const report = {
    generated: new Date().toISOString(),
    summary: {
      tests: statuses.tests.status,
      accessibility: statuses.a11y.status,
      performance: statuses.performance.status,
      quality: statuses.quality.status,
      coverage: statuses.coverage.status
    },
    details: statuses,
    recommendations: []
  };
  
  // Generate recommendations based on statuses
  if (statuses.tests.status === 'failing') {
    report.recommendations.push('🚨 Fix failing tests immediately');
  }
  
  if (statuses.a11y.status === 'poor') {
    report.recommendations.push('♿ Critical accessibility issues must be addressed');
  }
  
  if (statuses.performance.status === 'poor') {
    report.recommendations.push('⚡ Performance issues detected - investigate traces');
  }
  
  if (statuses.quality.status === 'poor') {
    report.recommendations.push('🔧 Code quality issues blocking progress');
  }
  
  if (statuses.coverage.status === 'poor') {
    report.recommendations.push('📊 Test coverage below 50% - add more tests');
  }
  
  // Overall health score
  const scores = {
    passing: 100,
    excellent: 100,
    good: 80,
    needs_work: 60,
    failing: 0,
    poor: 20,
    unknown: 50
  };
  
  const overallScore = Math.round(
    Object.values(statuses).reduce((sum, status) => sum + scores[status.status], 0) / 
    Object.keys(statuses).length
  );
  
  report.overallScore = overallScore;
  
  if (overallScore >= 90) {
    report.recommendations.push('🎉 Excellent overall quality! Keep up the great work!');
  } else if (overallScore >= 70) {
    report.recommendations.push('👍 Good quality! Focus on areas needing improvement.');
  } else if (overallScore >= 50) {
    report.recommendations.push('🔧 Quality needs attention. Prioritize critical issues.');
  } else {
    report.recommendations.push('🚨 Quality requires immediate attention!');
  }
  
  return report;
};

// Generate README badge section
const generateReadmeSection = (badges, report) => {
  const timestamp = new Date().toLocaleString();
  
  return `## 🚀 Quality Status

Last updated: ${timestamp}

${badges.join(' ')}

### 📊 Overall Health Score: ${report.overallScore}/100

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

### 🔍 Detailed Status

| Metric | Status | Details |
|--------|--------|---------|
| Tests | ${report.summary.tests} | ${report.details.tests.passed}/${report.details.tests.total} passing |
| Accessibility | ${report.summary.accessibility} | ${report.details.a11y.violations} violations (${report.details.a11y.critical} critical) |
| Performance | ${report.summary.performance} | ${report.details.performance.traces} traces collected |
| Code Quality | ${report.summary.quality} | ${report.details.quality.total} issues (${report.details.quality.errors} errors) |
| Coverage | ${report.summary.coverage} | ${report.details.coverage.percentage}% covered |

---
*This section is auto-generated. Run \`node scripts/generate-quality-badges.mjs\` to update.*
`;
};

// Main execution
const main = async () => {
  console.log('🔍 Generating quality badges...');
  
  try {
    // Collect all statuses
    const statuses = {
      tests: getTestStatus(),
      a11y: getA11yStatus(),
      performance: getPerformanceStatus(),
      quality: getQualityStatus(),
      coverage: getCoverageStatus()
    };
    
    console.log('📊 Statuses collected:');
    console.log(`  Tests: ${statuses.tests.status} (${statuses.tests.passed}/${statuses.tests.total})`);
    console.log(`  A11y: ${statuses.a11y.status} (${statuses.a11y.violations} violations)`);
    console.log(`  Performance: ${statuses.performance.status} (${statuses.performance.traces} traces)`);
    console.log(`  Quality: ${statuses.quality.status} (${statuses.quality.total} issues)`);
    console.log(`  Coverage: ${statuses.coverage.status} (${statuses.coverage.percentage}%)`);
    
    // Generate badges and report
    const badges = generateBadges(statuses);
    const report = generateStatusReport(statuses);
    const readmeSection = generateReadmeSection(badges, report);
    
    // Save detailed report
    const reportFile = join(PROJECT_ROOT, 'test-results', 'quality-status-report.json');
    const reportDir = dirname(reportFile);
    
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }
    
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to ${reportFile}`);
    
    // Save README section
    const readmeFile = join(PROJECT_ROOT, 'test-results', 'quality-badges-readme.md');
    writeFileSync(readmeFile, readmeSection);
    console.log(`📝 README section saved to ${readmeFile}`);
    
    // Display summary
    console.log('\n🎯 QUALITY BADGES GENERATED');
    console.log('=' .repeat(40));
    console.log(`Overall Score: ${report.overallScore}/100`);
    console.log('');
    console.log('📋 Badges:');
    badges.forEach(badge => console.log(`  ${badge}`));
    console.log('');
    console.log('💡 Copy the README section from quality-badges-readme.md to your README.md');
    
  } catch (error) {
    console.error('❌ Failed to generate quality badges:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, generateBadges, generateStatusReport };
