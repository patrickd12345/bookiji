#!/usr/bin/env node

/**
 * Warning Debt Burn-down Script
 * 
 * This script analyzes the codebase for various types of warnings and technical debt,
 * providing metrics and trends to help measure progress in code quality improvements.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Warning categories and their detection patterns
const WARNING_CATEGORIES = {
  // TypeScript/ESLint warnings
  'typescript-errors': {
    description: 'TypeScript compilation errors',
    command: 'pnpm type-check 2>&1 | grep -c "error TS" || echo "0"',
    severity: 'critical'
  },
  'eslint-warnings': {
    description: 'ESLint warnings and errors',
    command: 'pnpm lint 2>&1 | grep -c "warning\|error" || echo "0"',
    severity: 'moderate'
  },
  'unused-imports': {
    description: 'Unused imports and variables',
    command: 'pnpm lint 2>&1 | grep -c "unused\|never used" || echo "0"',
    severity: 'minor'
  },
  
  // Performance and best practices
  'console-statements': {
    description: 'Console.log/error statements in production code',
    command: `grep -r "console\\.(log|error|warn|info)" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ | grep -v "//.*console" | wc -l || echo "0"`,
    severity: 'moderate'
  },
  'any-types': {
    description: 'Usage of "any" type',
    command: `grep -r ": any" --include="*.ts" --include="*.tsx" src/ | wc -l || echo "0"`,
    severity: 'moderate'
  },
  'async-await': {
    description: 'Missing await on async calls',
    command: `grep -r "\\b\\w+\\(.*\\)\\.then\\|\\b\\w+\\(.*\\)\\.catch" --include="*.ts" --include="*.tsx" src/ | wc -l || echo "0"`,
    severity: 'moderate'
  },
  
  // Security and accessibility
  'dangerously-set-html': {
    description: 'Usage of dangerouslySetInnerHTML',
    command: `grep -r "dangerouslySetInnerHTML" --include="*.tsx" src/ | wc -l || echo "0"`,
    severity: 'high'
  },
  'missing-alt-text': {
    description: 'Images without alt text',
    command: `grep -r "<img" --include="*.tsx" src/ | grep -v "alt=" | wc -l || echo "0"`,
    severity: 'moderate'
  },
  
  // Code quality
  'magic-numbers': {
    description: 'Magic numbers in code',
    command: `grep -r "\\b[0-9]{2,}\\b" --include="*.ts" --include="*.tsx" src/ | grep -v "import\|export\|const\|let\|var" | wc -l || echo "0"`,
    severity: 'minor'
  },
  'long-functions': {
    description: 'Functions longer than 50 lines',
    command: `find src/ -name "*.ts" -o -name "*.tsx" | xargs wc -l | grep -E "\\s+[5-9][0-9]\\s+\\|\\s+[0-9]{3,}\\s+" | wc -l || echo "0"`,
    severity: 'minor'
  },
  'complex-conditions': {
    description: 'Complex boolean conditions',
    command: `grep -r "\\&\\&.*\\&\\&\\|\\|.*\\|\\|" --include="*.ts" --include="*.tsx" src/ | wc -l || echo "0"`,
    severity: 'minor'
  }
};

// Run command and return result
const runCommand = (command) => {
  try {
    const result = execSync(command, { 
      cwd: PROJECT_ROOT, 
      encoding: 'utf8',
      timeout: 30000 
    });
    return parseInt(result.trim()) || 0;
  } catch (error) {
    console.warn(`⚠️ Command failed: ${command}`);
    return 0;
  }
};

// Get current warning counts
const getCurrentWarnings = () => {
  const warnings = {};
  
  for (const [category, config] of Object.entries(WARNING_CATEGORIES)) {
    try {
      const count = runCommand(config.command);
      warnings[category] = {
        count,
        description: config.description,
        severity: config.severity,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn(`Failed to get count for ${category}:`, error.message);
      warnings[category] = {
        count: 0,
        description: config.description,
        severity: config.severity,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
  
  return warnings;
};

// Load historical data
const loadHistoricalData = () => {
  const historyFile = join(PROJECT_ROOT, 'test-results', 'warning-debt-history.json');
  
  if (existsSync(historyFile)) {
    try {
      return JSON.parse(readFileSync(historyFile, 'utf8'));
    } catch (error) {
      console.warn('Failed to load historical data:', error.message);
    }
  }
  
  return [];
};

// Save current data to history
const saveToHistory = (currentWarnings) => {
  const historyFile = join(PROJECT_ROOT, 'test-results', 'warning-debt-history.json');
  const historyDir = dirname(historyFile);
  
  if (!existsSync(historyDir)) {
    mkdirSync(historyDir, { recursive: true });
  }
  
  const history = loadHistoricalData();
  history.push({
    date: new Date().toISOString(),
    warnings: currentWarnings,
    summary: {
      total: Object.values(currentWarnings).reduce((sum, w) => sum + w.count, 0),
      bySeverity: Object.values(currentWarnings).reduce((acc, w) => {
        acc[w.severity] = (acc[w.severity] || 0) + w.count;
        return acc;
      }, {})
    }
  });
  
  writeFileSync(historyFile, JSON.stringify(history, null, 2));
  console.log(`📊 Historical data saved to ${historyFile}`);
};

// Generate trend analysis
const analyzeTrends = (history) => {
  if (history.length < 2) {
    return { message: 'Not enough data for trend analysis' };
  }
  
  const trends = {};
  const categories = Object.keys(WARNING_CATEGORIES);
  
  for (const category of categories) {
    const categoryHistory = history
      .filter(entry => entry.warnings[category])
      .map(entry => ({
        date: new Date(entry.date),
        count: entry.warnings[category].count
      }))
      .sort((a, b) => a.date - b.date);
    
    if (categoryHistory.length >= 2) {
      const first = categoryHistory[0];
      const last = categoryHistory[categoryHistory.length - 1];
      const change = last.count - first.count;
      const changePercent = first.count > 0 ? (change / first.count) * 100 : 0;
      
      trends[category] = {
        change,
        changePercent,
        trend: change < 0 ? 'improving' : change > 0 ? 'worsening' : 'stable',
        firstCount: first.count,
        lastCount: last.count,
        firstDate: first.date.toISOString().split('T')[0],
        lastDate: last.date.toISOString().split('T')[0]
      };
    }
  }
  
  return trends;
};

// Generate report
const generateReport = (currentWarnings, trends) => {
  const totalWarnings = Object.values(currentWarnings).reduce((sum, w) => sum + w.count, 0);
  const bySeverity = Object.values(currentWarnings).reduce((acc, w) => {
    acc[w.severity] = (acc[w.severity] || 0) + w.count;
    return acc;
  }, {});
  
  const report = {
    generated: new Date().toISOString(),
    summary: {
      total: totalWarnings,
      bySeverity,
      critical: bySeverity.critical || 0,
      high: bySeverity.high || 0,
      moderate: bySeverity.moderate || 0,
      minor: bySeverity.minor || 0
    },
    categories: currentWarnings,
    trends,
    recommendations: []
  };
  
  // Generate recommendations based on current state
  if (bySeverity.critical > 0) {
    report.recommendations.push('🚨 Critical issues must be fixed immediately');
  }
  
  if (bySeverity.high > 0) {
    report.recommendations.push('⚠️ High priority issues should be addressed this sprint');
  }
  
  if (bySeverity.moderate > 10) {
    report.recommendations.push('🔧 Consider addressing moderate issues in batches');
  }
  
  if (totalWarnings > 100) {
    report.recommendations.push('📚 Consider implementing automated fixes for common patterns');
  }
  
  // Add trend-based recommendations
  for (const [category, trend] of Object.entries(trends)) {
    if (trend.trend === 'worsening' && trend.changePercent > 20) {
      report.recommendations.push(`📈 ${category} is worsening rapidly (+${trend.changePercent.toFixed(1)}%)`);
    } else if (trend.trend === 'improving' && trend.changePercent < -50) {
      report.recommendations.push(`🎉 ${category} has improved significantly (${trend.changePercent.toFixed(1)}%)`);
    }
  }
  
  return report;
};

// Display report
const displayReport = (report) => {
  console.log('\n🚀 WARNING DEBT BURN-DOWN REPORT');
  console.log('=' .repeat(50));
  console.log(`Generated: ${new Date(report.generated).toLocaleString()}`);
  console.log('');
  
  // Summary
  console.log('📊 SUMMARY');
  console.log(`Total Warnings: ${report.summary.total}`);
  console.log(`Critical: ${report.summary.critical} | High: ${report.summary.high} | Moderate: ${report.summary.moderate} | Minor: ${report.summary.minor}`);
  console.log('');
  
  // Category breakdown
  console.log('📋 BY CATEGORY');
  for (const [category, data] of Object.entries(report.categories)) {
    const severity = data.severity.toUpperCase();
    const emoji = severity === 'CRITICAL' ? '🚨' : severity === 'HIGH' ? '⚠️' : severity === 'MODERATE' ? '🔧' : '📝';
    console.log(`${emoji} ${category}: ${data.count} (${severity})`);
  }
  console.log('');
  
  // Trends
  if (report.trends && Object.keys(report.trends).length > 0) {
    console.log('📈 TRENDS');
    for (const [category, trend] of Object.entries(report.trends)) {
      const arrow = trend.trend === 'improving' ? '↘️' : trend.trend === 'worsening' ? '↗️' : '➡️';
      const color = trend.trend === 'improving' ? '\x1b[32m' : trend.trend === 'worsening' ? '\x1b[31m' : '\x1b[33m';
      console.log(`${arrow} ${category}: ${trend.firstCount} → ${trend.lastCount} (${color}${trend.changePercent > 0 ? '+' : ''}${trend.changePercent.toFixed(1)}%\x1b[0m)`);
    }
    console.log('');
  }
  
  // Recommendations
  if (report.recommendations.length > 0) {
    console.log('💡 RECOMMENDATIONS');
    report.recommendations.forEach(rec => console.log(rec));
    console.log('');
  }
  
  // Progress indicator
  const progress = report.summary.total === 0 ? 100 : 
    Math.max(0, Math.min(100, 100 - (report.summary.total / 10)));
  const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
  console.log(`🎯 PROGRESS: [${progressBar}] ${progress.toFixed(1)}%`);
  
  if (progress >= 90) {
    console.log('🎉 Excellent! You\'re maintaining high code quality!');
  } else if (progress >= 70) {
    console.log('👍 Good progress! Keep up the momentum!');
  } else if (progress >= 50) {
    console.log('🔧 Room for improvement. Focus on critical and high priority issues.');
  } else {
    console.log('🚨 Significant technical debt. Consider a dedicated cleanup sprint.');
  }
};

// Main execution
const main = async () => {
  console.log('🔍 Analyzing warning debt...');
  
  try {
    // Get current warnings
    const currentWarnings = getCurrentWarnings();
    
    // Save to history
    saveToHistory(currentWarnings);
    
    // Load and analyze trends
    const history = loadHistoricalData();
    const trends = analyzeTrends(history);
    
    // Generate and display report
    const report = generateReport(currentWarnings, trends);
    displayReport(report);
    
    // Save detailed report
    const reportFile = join(PROJECT_ROOT, 'test-results', 'warning-debt-report.json');
    const reportDir = dirname(reportFile);
    
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }
    
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to ${reportFile}`);
    
    // Exit with error code if critical issues exist
    if (report.summary.critical > 0) {
      console.log('\n❌ Critical issues detected. Exiting with error code.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Failed to analyze warning debt:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, getCurrentWarnings, analyzeTrends };
