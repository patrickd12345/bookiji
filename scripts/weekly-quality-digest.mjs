#!/usr/bin/env node

/**
 * Weekly Quality Digest Generator
 * 
 * This script generates a comprehensive weekly quality report combining:
 * - Content audits
 * - Accessibility probes
 * - Performance metrics
 * - Warning debt trends
 * - Test coverage status
 * 
 * Output can be posted to Slack, Teams, or other team communication platforms.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Configuration
const DIGEST_CONFIG = {
  // Time periods for analysis
  periods: {
    week: 7,      // Last 7 days
    month: 30,    // Last 30 days
    quarter: 90   // Last 90 days
  },
  
  // Thresholds for status indicators
  thresholds: {
    a11y: {
      excellent: 0,      // 0 violations
      good: 5,           // 1-5 violations
      needs_work: 20,    // 6-20 violations
      poor: 20           // >20 violations
    },
    performance: {
      excellent: 95,     // >95% of metrics meet thresholds
      good: 80,          // 80-95% of metrics meet thresholds
      needs_work: 60,    // 60-80% of metrics meet thresholds
      poor: 60           // <60% of metrics meet thresholds
    },
    quality: {
      excellent: 0,      // 0 errors
      good: 5,           // 1-5 errors
      needs_work: 20,    // 6-20 errors
      poor: 20           // >20 errors
    }
  }
};

// Helper functions
const runCommand = (command, defaultValue = '') => {
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

const getFileStats = (path, days = 7) => {
  try {
    const files = execSync(`find ${path} -type f -mtime -${days} 2>/dev/null | wc -l`, { 
      cwd: PROJECT_ROOT, 
      encoding: 'utf8' 
    }).trim();
    return parseInt(files) || 0;
  } catch (error) {
    return 0;
  }
};

const getRecentData = (path, pattern, days = 7) => {
  try {
    const files = execSync(`find ${path} -name "${pattern}" -mtime -${days} 2>/dev/null`, { 
      cwd: PROJECT_ROOT, 
      encoding: 'utf8' 
    }).trim().split('\n').filter(f => f);
    
    return files.map(file => {
      try {
        const content = readFileSync(file, 'utf8');
        return JSON.parse(content);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    return [];
  }
};

// Collect weekly metrics
const collectWeeklyMetrics = () => {
  const metrics = {
    timestamp: new Date().toISOString(),
    period: 'weekly',
    summary: {},
    details: {},
    trends: {},
    recommendations: []
  };
  
  // Test coverage and status
  try {
    const testOutput = runCommand('pnpm vitest run --reporter=verbose 2>&1', '');
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
      }
    }
    
    metrics.details.tests = {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0
    };
    
    // Test status
    if (failedTests === 0) {
      metrics.summary.tests = 'excellent';
    } else if (failedTests < totalTests * 0.1) {
      metrics.summary.tests = 'good';
    } else if (failedTests < totalTests * 0.3) {
      metrics.summary.tests = 'needs_work';
    } else {
      metrics.summary.tests = 'poor';
    }
  } catch (error) {
    metrics.details.tests = { error: error.message };
    metrics.summary.tests = 'unknown';
  }
  
  // Accessibility metrics
  try {
    const a11yData = getRecentData('test-results/a11y-artifacts', '*.json', DIGEST_CONFIG.periods.week);
    
    let totalViolations = 0;
    let criticalViolations = 0;
    let seriousViolations = 0;
    let moderateViolations = 0;
    let minorViolations = 0;
    
    a11yData.forEach(data => {
      if (data.violations) {
        totalViolations += data.violations.length;
        
        data.violations.forEach(violation => {
          const impact = violation.impact || 'minor';
          const nodeCount = violation.nodes?.length || 1;
          
          switch (impact) {
            case 'critical':
              criticalViolations += nodeCount;
              break;
            case 'serious':
              seriousViolations += nodeCount;
              break;
            case 'moderate':
              moderateViolations += nodeCount;
              break;
            case 'minor':
              minorViolations += nodeCount;
              break;
          }
        });
      }
    });
    
    metrics.details.accessibility = {
      totalViolations,
      criticalViolations,
      seriousViolations,
      moderateViolations,
      minorViolations,
      reportsAnalyzed: a11yData.length
    };
    
    // A11y status
    if (criticalViolations > 0) {
      metrics.summary.accessibility = 'poor';
    } else if (totalViolations > DIGEST_CONFIG.thresholds.a11y.needs_work) {
      metrics.summary.accessibility = 'needs_work';
    } else if (totalViolations > DIGEST_CONFIG.thresholds.a11y.good) {
      metrics.summary.accessibility = 'good';
    } else {
      metrics.summary.accessibility = 'excellent';
    }
  } catch (error) {
    metrics.details.accessibility = { error: error.message };
    metrics.summary.accessibility = 'unknown';
  }
  
  // Performance metrics
  try {
    const perfData = getRecentData('test-results/performance-traces', '*.zip', DIGEST_CONFIG.periods.week);
    const traceCount = perfData.length;
    
    metrics.details.performance = {
      tracesCollected: traceCount,
      lastRun: traceCount > 0 ? 'recent' : 'none'
    };
    
    // Performance status
    if (traceCount === 0) {
      metrics.summary.performance = 'unknown';
    } else if (traceCount >= 5) {
      metrics.summary.performance = 'excellent';
    } else if (traceCount >= 3) {
      metrics.summary.performance = 'good';
    } else {
      metrics.summary.performance = 'needs_work';
    }
  } catch (error) {
    metrics.details.performance = { error: error.message };
    metrics.summary.performance = 'unknown';
  }
  
  // Code quality metrics
  try {
    const lintOutput = runCommand('pnpm lint 2>&1', '');
    const warningCount = (lintOutput.match(/warning/gi) || []).length;
    const errorCount = (lintOutput.match(/error/gi) || []).length;
    const totalIssues = warningCount + errorCount;
    
    metrics.details.quality = {
      warnings: warningCount,
      errors: errorCount,
      totalIssues
    };
    
    // Quality status
    if (errorCount > 0) {
      metrics.summary.quality = 'poor';
    } else if (totalIssues > DIGEST_CONFIG.thresholds.quality.needs_work) {
      metrics.summary.quality = 'needs_work';
    } else if (totalIssues > DIGEST_CONFIG.thresholds.quality.good) {
      metrics.summary.quality = 'good';
    } else {
      metrics.summary.quality = 'excellent';
    }
  } catch (error) {
    metrics.details.quality = { error: error.message };
    metrics.summary.quality = 'unknown';
  }
  
  // Warning debt trends
  try {
    const warningHistory = getRecentData('test-results', 'warning-debt-history.json', DIGEST_CONFIG.periods.month);
    
    if (warningHistory.length >= 2) {
      const sortedHistory = warningHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
      const first = sortedHistory[0];
      const last = sortedHistory[sortedHistory.length - 1];
      
      const change = last.summary.total - first.summary.total;
      const changePercent = first.summary.total > 0 ? (change / first.summary.total) * 100 : 0;
      
      metrics.trends.warningDebt = {
        change,
        changePercent,
        trend: change < 0 ? 'improving' : change > 0 ? 'worsening' : 'stable',
        firstTotal: first.summary.total,
        lastTotal: last.summary.total,
        firstDate: first.date,
        lastDate: last.date
      };
    }
  } catch (error) {
    metrics.trends.warningDebt = { error: error.message };
  }
  
  // GitHub Actions status
  try {
    const workflowRuns = runCommand('gh run list --limit 20 --json status,conclusion,createdAt 2>/dev/null', '');
    
    if (workflowRuns) {
      const runs = JSON.parse(workflowRuns);
      const recentRuns = runs.filter(run => {
        const runDate = new Date(run.createdAt);
        const weekAgo = new Date(Date.now() - DIGEST_CONFIG.periods.week * 24 * 60 * 60 * 1000);
        return runDate >= weekAgo;
      });
      
      const successfulRuns = recentRuns.filter(run => run.conclusion === 'success').length;
      const failedRuns = recentRuns.filter(run => run.conclusion === 'failure').length;
      const totalRuns = recentRuns.length;
      
      metrics.details.ci = {
        totalRuns,
        successfulRuns,
        failedRuns,
        successRate: totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0
      };
      
      // CI status
      if (failedRuns === 0) {
        metrics.summary.ci = 'excellent';
      } else if (failedRuns < totalRuns * 0.1) {
        metrics.summary.ci = 'good';
      } else if (failedRuns < totalRuns * 0.3) {
        metrics.summary.ci = 'needs_work';
      } else {
        metrics.summary.ci = 'poor';
      }
    }
  } catch (error) {
    metrics.details.ci = { error: error.message };
    metrics.summary.ci = 'unknown';
  }
  
  return metrics;
};

// Generate recommendations
const generateRecommendations = (metrics) => {
  const recommendations = [];
  
  // Test recommendations
  if (metrics.summary.tests === 'poor') {
    recommendations.push('🚨 **Tests failing** - Fix failing tests immediately to restore CI pipeline');
  } else if (metrics.summary.tests === 'needs_work') {
    recommendations.push('🔧 **Test stability** - Investigate flaky tests and improve test reliability');
  }
  
  // Accessibility recommendations
  if (metrics.summary.accessibility === 'poor') {
    recommendations.push('♿ **Critical a11y issues** - Address accessibility violations for legal compliance');
  } else if (metrics.summary.accessibility === 'needs_work') {
    recommendations.push('🔧 **A11y improvements** - Focus on high-impact accessibility fixes');
  }
  
  // Performance recommendations
  if (metrics.summary.performance === 'unknown') {
    recommendations.push('⚡ **Performance monitoring** - Set up regular performance testing');
  } else if (metrics.summary.performance === 'needs_work') {
    recommendations.push('🔧 **Performance optimization** - Investigate performance bottlenecks');
  }
  
  // Quality recommendations
  if (metrics.summary.quality === 'poor') {
    recommendations.push('🔧 **Code quality** - Fix linting errors to maintain code standards');
  } else if (metrics.summary.quality === 'needs_work') {
    recommendations.push('📝 **Code cleanup** - Address linting warnings for better maintainability');
  }
  
  // CI recommendations
  if (metrics.summary.ci === 'poor') {
    recommendations.push('🔄 **CI stability** - Investigate and fix CI pipeline failures');
  } else if (metrics.summary.ci === 'needs_work') {
    recommendations.push('🔧 **CI reliability** - Improve test stability and reduce flaky builds');
  }
  
  // Warning debt trends
  if (metrics.trends.warningDebt?.trend === 'worsening') {
    recommendations.push('📈 **Technical debt** - Warning debt is increasing, consider cleanup sprint');
  } else if (metrics.trends.warningDebt?.trend === 'improving') {
    recommendations.push('🎉 **Great progress** - Warning debt decreasing, keep up the good work!');
  }
  
  // Overall health recommendations
  const excellentCount = Object.values(metrics.summary).filter(s => s === 'excellent').length;
  const poorCount = Object.values(metrics.summary).filter(s => s === 'poor').length;
  
  if (excellentCount >= 4) {
    recommendations.push('🌟 **Outstanding quality** - Team is maintaining excellent standards across all metrics');
  } else if (poorCount >= 2) {
    recommendations.push('🚨 **Quality attention needed** - Multiple areas require immediate attention');
  }
  
  return recommendations;
};

// Generate Slack/Teams formatted message
const generateSlackMessage = (metrics, recommendations) => {
  const statusEmojis = {
    excellent: '🟢',
    good: '🟡',
    needs_work: '🟠',
    poor: '🔴',
    unknown: '⚪'
  };
  
  const statusText = {
    excellent: 'Excellent',
    good: 'Good',
    needs_work: 'Needs Work',
    poor: 'Poor',
    unknown: 'Unknown'
  };
  
  const message = {
    text: `📊 *Weekly Quality Digest - ${new Date().toLocaleDateString()}*`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📊 Weekly Quality Digest - ${new Date().toLocaleDateString()}`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Quality Status Overview*\nHere's how we're doing across all quality metrics this week:`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Tests*\n${statusEmojis[metrics.summary.tests]} ${statusText[metrics.summary.tests]}`
          },
          {
            type: 'mrkdwn',
            text: `*Accessibility*\n${statusEmojis[metrics.summary.accessibility]} ${statusText[metrics.summary.accessibility]}`
          },
          {
            type: 'mrkdwn',
            text: `*Performance*\n${statusEmojis[metrics.summary.performance]} ${statusText[metrics.summary.performance]}`
          },
          {
            type: 'mrkdwn',
            text: `*Code Quality*\n${statusEmojis[metrics.summary.quality]} ${statusText[metrics.summary.quality]}`
          }
        ]
      }
    ]
  };
  
  // Add detailed metrics
  if (metrics.details.tests && !metrics.details.tests.error) {
    message.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🧪 Test Results*\n• Total: ${metrics.details.tests.total}\n• Passed: ${metrics.details.tests.passed}\n• Failed: ${metrics.details.tests.failed}\n• Success Rate: ${metrics.details.tests.successRate.toFixed(1)}%`
      }
    });
  }
  
  if (metrics.details.accessibility && !metrics.details.accessibility.error) {
    message.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*♿ Accessibility Status*\n• Total Violations: ${metrics.details.accessibility.totalViolations}\n• Critical: ${metrics.details.accessibility.criticalViolations}\n• Serious: ${metrics.details.accessibility.seriousViolations}\n• Reports Analyzed: ${metrics.details.accessibility.reportsAnalyzed}`
      }
    });
  }
  
  if (metrics.details.ci && !metrics.details.ci.error) {
    message.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🔄 CI/CD Pipeline*\n• Total Runs: ${metrics.details.ci.totalRuns}\n• Successful: ${metrics.details.ci.successfulRuns}\n• Failed: ${metrics.details.ci.failedRuns}\n• Success Rate: ${metrics.details.ci.successRate.toFixed(1)}%`
      }
    });
  }
  
  // Add trends
  if (metrics.trends.warningDebt && !metrics.trends.warningDebt.error) {
    const trend = metrics.trends.warningDebt;
    const trendEmoji = trend.trend === 'improving' ? '📉' : trend.trend === 'worsening' ? '📈' : '➡️';
    
    message.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📊 Warning Debt Trend*\n${trendEmoji} ${trend.trend.charAt(0).toUpperCase() + trend.trend.slice(1)}\n• Change: ${trend.change > 0 ? '+' : ''}${trend.change} (${trend.changePercent > 0 ? '+' : ''}${trend.changePercent.toFixed(1)}%)\n• From: ${trend.firstTotal} → ${trend.lastTotal}`
      }
    });
  }
  
  // Add recommendations
  if (recommendations.length > 0) {
    message.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*💡 Recommendations*\n${recommendations.map(rec => `• ${rec}`).join('\n')}`
      }
    });
  }
  
  // Add footer
  message.blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Generated by Bookiji Quality System | Run \`node scripts/weekly-quality-digest.mjs\` to regenerate`
      }
    ]
  });
  
  return message;
};

// Generate markdown report
const generateMarkdownReport = (metrics, recommendations) => {
  const statusEmojis = {
    excellent: '🟢',
    good: '🟡',
    needs_work: '🟠',
    poor: '🔴',
    unknown: '⚪'
  };
  
  const statusText = {
    excellent: 'Excellent',
    good: 'Good',
    needs_work: 'Needs Work',
    poor: 'Poor',
    unknown: 'Unknown'
  };
  
  let report = `# 📊 Weekly Quality Digest

**Generated**: ${new Date().toLocaleString()}
**Period**: Last 7 days

## 🎯 Quality Status Overview

| Metric | Status | Details |
|--------|--------|---------|
| Tests | ${statusEmojis[metrics.summary.tests]} ${statusText[metrics.summary.tests]} | ${metrics.details.tests?.total || 0} total, ${metrics.details.tests?.passed || 0} passed |
| Accessibility | ${statusEmojis[metrics.summary.accessibility]} ${statusText[metrics.summary.accessibility]} | ${metrics.details.accessibility?.totalViolations || 0} violations |
| Performance | ${statusEmojis[metrics.summary.performance]} ${statusText[metrics.summary.performance]} | ${metrics.details.performance?.tracesCollected || 0} traces |
| Code Quality | ${statusEmojis[metrics.summary.quality]} ${statusText[metrics.summary.quality]} | ${metrics.details.quality?.totalIssues || 0} issues |
| CI/CD | ${statusEmojis[metrics.summary.ci]} ${statusText[metrics.summary.ci]} | ${metrics.details.ci?.successRate?.toFixed(1) || 0}% success rate |

## 📈 Detailed Metrics

### 🧪 Test Results
- **Total Tests**: ${metrics.details.tests?.total || 0}
- **Passed**: ${metrics.details.tests?.passed || 0}
- **Failed**: ${metrics.details.tests?.failed || 0}
- **Success Rate**: ${metrics.details.tests?.successRate?.toFixed(1) || 0}%

### ♿ Accessibility Status
- **Total Violations**: ${metrics.details.accessibility?.totalViolations || 0}
- **Critical**: ${metrics.details.accessibility?.criticalViolations || 0}
- **Serious**: ${metrics.details.accessibility?.seriousViolations || 0}
- **Moderate**: ${metrics.details.accessibility?.moderateViolations || 0}
- **Minor**: ${metrics.details.accessibility?.minorViolations || 0}
- **Reports Analyzed**: ${metrics.details.accessibility?.reportsAnalyzed || 0}

### ⚡ Performance Metrics
- **Traces Collected**: ${metrics.details.performance?.tracesCollected || 0}
- **Last Run**: ${metrics.details.performance?.lastRun || 'Unknown'}

### 🔧 Code Quality
- **Warnings**: ${metrics.details.quality?.warnings || 0}
- **Errors**: ${metrics.details.quality?.errors || 0}
- **Total Issues**: ${metrics.details.quality?.totalIssues || 0}

### 🔄 CI/CD Pipeline
- **Total Runs**: ${metrics.details.ci?.totalRuns || 0}
- **Successful**: ${metrics.details.ci?.successfulRuns || 0}
- **Failed**: ${metrics.details.ci?.failedRuns || 0}
- **Success Rate**: ${metrics.details.ci?.successRate?.toFixed(1) || 0}%

## 📊 Trends

### Warning Debt
`;
  
  if (metrics.trends.warningDebt && !metrics.trends.warningDebt.error) {
    const trend = metrics.trends.warningDebt;
    const trendEmoji = trend.trend === 'improving' ? '📉' : trend.trend === 'worsening' ? '📈' : '➡️';
    
    report += `- **Trend**: ${trendEmoji} ${trend.trend.charAt(0).toUpperCase() + trend.trend.slice(1)}
- **Change**: ${trend.change > 0 ? '+' : ''}${trend.change} (${trend.changePercent > 0 ? '+' : ''}${trend.changePercent.toFixed(1)}%)
- **From**: ${trend.firstTotal} → ${trend.lastTotal}
- **Period**: ${new Date(trend.firstDate).toLocaleDateString()} to ${new Date(trend.lastDate).toLocaleDateString()}

`;
  } else {
    report += `- **Status**: Insufficient data for trend analysis

`;
  }
  
  // Add recommendations
  if (recommendations.length > 0) {
    report += `## 💡 Recommendations

${recommendations.map(rec => `- ${rec}`).join('\n')}

`;
  }
  
  // Add footer
  report += `---

*This report was generated by the Bookiji Quality System. Run \`node scripts/weekly-quality-digest.mjs\` to regenerate.*
`;
  
  return report;
};

// Main execution
const main = async () => {
  console.log('📊 Generating weekly quality digest...');
  
  try {
    // Collect metrics
    const metrics = collectWeeklyMetrics();
    
    // Generate recommendations
    const recommendations = generateRecommendations(metrics);
    metrics.recommendations = recommendations;
    
    // Generate outputs
    const slackMessage = generateSlackMessage(metrics, recommendations);
    const markdownReport = generateMarkdownReport(metrics, recommendations);
    
    // Save outputs
    const outputDir = join(PROJECT_ROOT, 'test-results', 'quality-digests');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save JSON data
    const jsonFile = join(outputDir, `weekly-digest-${timestamp}.json`);
    writeFileSync(jsonFile, JSON.stringify(metrics, null, 2));
    
    // Save Slack message
    const slackFile = join(outputDir, `weekly-digest-${timestamp}-slack.json`);
    writeFileSync(slackFile, JSON.stringify(slackMessage, null, 2));
    
    // Save markdown report
    const markdownFile = join(outputDir, `weekly-digest-${timestamp}.md`);
    writeFileSync(markdownFile, markdownReport);
    
    // Display summary
    console.log('\n🎯 WEEKLY QUALITY DIGEST GENERATED');
    console.log('=' .repeat(40));
    console.log(`Tests: ${metrics.summary.tests}`);
    console.log(`Accessibility: ${metrics.summary.accessibility}`);
    console.log(`Performance: ${metrics.summary.performance}`);
    console.log(`Code Quality: ${metrics.summary.quality}`);
    console.log(`CI/CD: ${metrics.summary.ci}`);
    console.log('');
    console.log('📋 Files saved:');
    console.log(`  JSON data: ${jsonFile}`);
    console.log(`  Slack message: ${slackFile}`);
    console.log(`  Markdown report: ${markdownFile}`);
    console.log('');
    console.log('💡 Copy the Slack message to your team chat for visibility');
    console.log('📝 Use the markdown report for documentation or email updates');
    
  } catch (error) {
    console.error('❌ Failed to generate weekly digest:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, collectWeeklyMetrics, generateSlackMessage, generateMarkdownReport };
