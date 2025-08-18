#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

/**
 * Bookiji Quality Index - Fusion of A11Y + Performance into one score
 * 
 * Scoring Formula:
 * - Accessibility: 40% weight (WCAG compliance critical for legal/ethical reasons)
 * - Performance: 35% weight (Core Web Vitals for user experience)
 * - Code Quality: 15% weight (Console errors, best practices)
 * - Stability: 10% weight (Test pass rate, error boundaries)
 * 
 * Score: 0-100 (higher is better)
 * 90-100: Legendary ⭐⭐⭐⭐⭐
 * 80-89:  Excellent ⭐⭐⭐⭐
 * 70-79:  Good     ⭐⭐⭐
 * 60-69:  Fair     ⭐⭐
 * 0-59:   Poor     ⭐
 */

const CONFIG = {
  WEIGHTS: {
    accessibility: 0.40,
    performance: 0.35,
    codeQuality: 0.15,
    stability: 0.10
  },
  BUDGETS: {
    a11y: { violations: 0, critical: 0 },
    perf: { TBT: 300, FCP: 2200, CLS: 0.1 },
    quality: { consoleErrors: 5, warnings: 10 },
    stability: { testPassRate: 0.90 }
  },
  PATHS: {
    reports: './quality-reports',
    dashboard: './quality-dashboard',
    artifacts: './packages/pw-tests/test-results'
  }
};

class QualityIndexCalculator {
  constructor() {
    this.timestamp = new Date().toISOString();
    this.results = {
      timestamp: this.timestamp,
      accessibility: { score: 0, details: {} },
      performance: { score: 0, details: {} },
      codeQuality: { score: 0, details: {} },
      stability: { score: 0, details: {} },
      overall: { score: 0, grade: '', trend: '' }
    };
  }

  async run() {
    console.log('🎯 Calculating Bookiji Quality Index...\n');
    
    this.ensureDirectories();
    
    // Run all quality checks
    await this.measureAccessibility();
    await this.measurePerformance(); 
    await this.measureCodeQuality();
    await this.measureStability();
    
    // Calculate fusion score
    this.calculateOverallScore();
    
    // Generate reports
    this.saveResults();
    this.generateDashboard();
    this.printSummary();
    
    return this.results;
  }

  ensureDirectories() {
    Object.values(CONFIG.PATHS).forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  async measureAccessibility() {
    console.log('🔍 Measuring Accessibility...');
    
    try {
      // Run accessibility tests and capture results
      const output = execSync('pnpm test:a11y 2>&1', { 
        encoding: 'utf8',
        timeout: 60000 
      });
      
      // Parse test results for violations
      const violations = this.parseA11yOutput(output);
      const criticalViolations = violations.filter(v => v.impact === 'critical').length;
      
      // Score based on violations (100 = perfect, 0 = many violations)
      const violationPenalty = Math.min(violations.length * 10, 80);
      const criticalPenalty = Math.min(criticalViolations * 25, 50);
      const score = Math.max(0, 100 - violationPenalty - criticalPenalty);
      
      this.results.accessibility = {
        score: Math.round(score),
        details: {
          totalViolations: violations.length,
          criticalViolations,
          pages: this.parseA11yPages(output),
          status: violations.length === 0 ? 'WCAG 2.1 AA Compliant' : 'Has Violations'
        }
      };
      
      console.log(`   ✅ A11Y Score: ${this.results.accessibility.score}/100`);
    } catch (error) {
      console.log(`   ❌ A11Y Tests Failed: ${error.message}`);
      this.results.accessibility = {
        score: 0,
        details: { error: error.message, status: 'Test Failure' }
      };
    }
  }

  async measurePerformance() {
    console.log('🚀 Measuring Performance...');
    
    try {
      const output = execSync('cd packages/pw-tests && npx playwright test tests/perf/budgets.spec.ts 2>&1', {
        encoding: 'utf8',
        timeout: 60000
      });
      
      const metrics = this.parsePerfOutput(output);
      const score = this.calculatePerfScore(metrics);
      
      this.results.performance = {
        score: Math.round(score),
        details: {
          avgTBT: metrics.avgTBT,
          avgFCP: metrics.avgFCP,
          avgCLS: metrics.avgCLS,
          pages: metrics.pages,
          status: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Improvement'
        }
      };
      
      console.log(`   ✅ Perf Score: ${this.results.performance.score}/100`);
    } catch (error) {
      console.log(`   ❌ Performance Tests Failed: ${error.message}`);
      this.results.performance = {
        score: 0,
        details: { error: error.message, status: 'Test Failure' }
      };
    }
  }

  async measureCodeQuality() {
    console.log('🔧 Measuring Code Quality...');
    
    try {
      // Check for console errors, warnings, and code smells
      const lintOutput = this.runSafely('pnpm lint:crit 2>&1');
      const typeOutput = this.runSafely('pnpm typecheck 2>&1');
      
      const lintIssues = this.countLintIssues(lintOutput);
      const typeIssues = this.countTypeIssues(typeOutput);
      
      // Score based on issues (fewer issues = higher score)
      const issuePenalty = (lintIssues.errors * 5) + (lintIssues.warnings * 2) + (typeIssues * 3);
      const score = Math.max(0, 100 - Math.min(issuePenalty, 90));
      
      this.results.codeQuality = {
        score: Math.round(score),
        details: {
          lintErrors: lintIssues.errors,
          lintWarnings: lintIssues.warnings,
          typeErrors: typeIssues,
          status: score >= 80 ? 'Clean' : score >= 60 ? 'Minor Issues' : 'Needs Cleanup'
        }
      };
      
      console.log(`   ✅ Code Quality Score: ${this.results.codeQuality.score}/100`);
    } catch (error) {
      console.log(`   ❌ Code Quality Check Failed: ${error.message}`);
      this.results.codeQuality = {
        score: 50, // Neutral score if we can't measure
        details: { error: error.message, status: 'Check Failed' }
      };
    }
  }

  async measureStability() {
    console.log('🛡️ Measuring Stability...');
    
    try {
      // Run smoke tests to check basic stability
      const output = execSync('cd packages/pw-tests && npx playwright test --grep smoke 2>&1', {
        encoding: 'utf8',
        timeout: 30000
      });
      
      const testResults = this.parseTestOutput(output);
      const passRate = testResults.passed / (testResults.passed + testResults.failed);
      const score = passRate * 100;
      
      this.results.stability = {
        score: Math.round(score),
        details: {
          testsRun: testResults.passed + testResults.failed,
          testsPassed: testResults.passed,
          testsFailed: testResults.failed,
          passRate: Math.round(passRate * 100),
          status: passRate >= 0.95 ? 'Rock Solid' : passRate >= 0.80 ? 'Stable' : 'Unstable'
        }
      };
      
      console.log(`   ✅ Stability Score: ${this.results.stability.score}/100`);
    } catch (error) {
      console.log(`   ❌ Stability Tests Failed: ${error.message}`);
      this.results.stability = {
        score: 0,
        details: { error: error.message, status: 'Critical Failure' }
      };
    }
  }

  calculatePerfScore(metrics) {
    // Score each metric against budget
    const tbtScore = Math.max(0, 100 - (metrics.avgTBT / CONFIG.BUDGETS.perf.TBT * 100));
    const fcpScore = Math.max(0, 100 - (metrics.avgFCP / CONFIG.BUDGETS.perf.FCP * 100));
    const clsScore = Math.max(0, 100 - (metrics.avgCLS / CONFIG.BUDGETS.perf.CLS * 100));
    
    // Weighted average (TBT is most important for perceived performance)
    return (tbtScore * 0.5) + (fcpScore * 0.3) + (clsScore * 0.2);
  }

  calculateOverallScore() {
    const { accessibility, performance, codeQuality, stability } = this.results;
    const { WEIGHTS } = CONFIG;
    
    const weightedScore = 
      (accessibility.score * WEIGHTS.accessibility) +
      (performance.score * WEIGHTS.performance) +
      (codeQuality.score * WEIGHTS.codeQuality) +
      (stability.score * WEIGHTS.stability);
    
    const score = Math.round(weightedScore);
    
    this.results.overall = {
      score,
      grade: this.getGrade(score),
      trend: this.calculateTrend(score),
      breakdown: {
        accessibility: Math.round(accessibility.score * WEIGHTS.accessibility),
        performance: Math.round(performance.score * WEIGHTS.performance),
        codeQuality: Math.round(codeQuality.score * WEIGHTS.codeQuality),
        stability: Math.round(stability.score * WEIGHTS.stability)
      }
    };
  }

  getGrade(score) {
    if (score >= 90) return '⭐⭐⭐⭐⭐ Legendary';
    if (score >= 80) return '⭐⭐⭐⭐ Excellent';
    if (score >= 70) return '⭐⭐⭐ Good';
    if (score >= 60) return '⭐⭐ Fair';
    return '⭐ Poor';
  }

  calculateTrend(score) {
    // Compare with previous score if available
    const historyFile = join(CONFIG.PATHS.reports, 'quality-history.json');
    if (existsSync(historyFile)) {
      try {
        const history = JSON.parse(readFileSync(historyFile, 'utf8'));
        if (history.length > 0) {
          const lastScore = history[history.length - 1].overall.score;
          const diff = score - lastScore;
          if (diff > 2) return '📈 Improving';
          if (diff < -2) return '📉 Declining';
          return '📊 Stable';
        }
      } catch (e) {
        // History file corrupted, ignore
      }
    }
    return '📊 Baseline';
  }

  generateDashboard() {
    const { overall, accessibility, performance, codeQuality, stability } = this.results;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bookiji Quality Index Dashboard</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #f8fafc; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; text-align: center; }
        .header h1 { margin: 0; font-size: 2.5rem; }
        .subtitle { opacity: 0.9; margin-top: 0.5rem; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .score-card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 2rem; }
        .big-score { text-align: center; padding: 3rem; }
        .score-number { font-size: 4rem; font-weight: bold; margin: 0; color: ${overall.score >= 80 ? '#10b981' : overall.score >= 60 ? '#f59e0b' : '#ef4444'}; }
        .score-grade { font-size: 1.5rem; margin: 0.5rem 0; }
        .score-trend { font-size: 1.2rem; opacity: 0.8; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
        .metric-card { background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-header { display: flex; justify-content: between; align-items: center; margin-bottom: 1rem; }
        .metric-title { font-weight: 600; font-size: 1.1rem; }
        .metric-score { font-size: 2rem; font-weight: bold; }
        .metric-details { font-size: 0.9rem; color: #6b7280; line-height: 1.5; }
        .progress-bar { background: #e5e7eb; border-radius: 4px; height: 8px; margin: 1rem 0; }
        .progress-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
        .timestamp { text-align: center; color: #6b7280; margin-top: 2rem; }
        .legend { background: #f3f4f6; padding: 1rem; border-radius: 8px; margin-top: 2rem; }
        .legend h3 { margin-top: 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Bookiji Quality Index</h1>
        <div class="subtitle">Continuous quality monitoring • Accessibility + Performance + Code Quality + Stability</div>
    </div>
    
    <div class="container">
        <div class="score-card">
            <div class="big-score">
                <div class="score-number">${overall.score}</div>
                <div class="score-grade">${overall.grade}</div>
                <div class="score-trend">${overall.trend}</div>
            </div>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-header">
                    <div class="metric-title">♿ Accessibility (40%)</div>
                    <div class="metric-score" style="color: ${accessibility.score >= 80 ? '#10b981' : '#ef4444'}">${accessibility.score}</div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${accessibility.score}%; background: ${accessibility.score >= 80 ? '#10b981' : '#ef4444'}"></div>
                </div>
                <div class="metric-details">
                    Status: ${accessibility.details.status}<br>
                    ${accessibility.details.totalViolations !== undefined ? 
                      `Violations: ${accessibility.details.totalViolations} (${accessibility.details.criticalViolations} critical)` : 
                      'Test results pending'}
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <div class="metric-title">🚀 Performance (35%)</div>
                    <div class="metric-score" style="color: ${performance.score >= 80 ? '#10b981' : performance.score >= 60 ? '#f59e0b' : '#ef4444'}">${performance.score}</div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${performance.score}%; background: ${performance.score >= 80 ? '#10b981' : performance.score >= 60 ? '#f59e0b' : '#ef4444'}"></div>
                </div>
                <div class="metric-details">
                    Status: ${performance.details.status}<br>
                    ${performance.details.avgFCP !== undefined ? 
                      `Avg FCP: ${performance.details.avgFCP}ms • TBT: ${performance.details.avgTBT}ms • CLS: ${performance.details.avgCLS}` : 
                      'Test results pending'}
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <div class="metric-title">🔧 Code Quality (15%)</div>
                    <div class="metric-score" style="color: ${codeQuality.score >= 80 ? '#10b981' : codeQuality.score >= 60 ? '#f59e0b' : '#ef4444'}">${codeQuality.score}</div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${codeQuality.score}%; background: ${codeQuality.score >= 80 ? '#10b981' : codeQuality.score >= 60 ? '#f59e0b' : '#ef4444'}"></div>
                </div>
                <div class="metric-details">
                    Status: ${codeQuality.details.status}<br>
                    ${codeQuality.details.lintErrors !== undefined ? 
                      `Lint: ${codeQuality.details.lintErrors} errors, ${codeQuality.details.lintWarnings} warnings • Types: ${codeQuality.details.typeErrors} errors` : 
                      'Analysis pending'}
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <div class="metric-title">🛡️ Stability (10%)</div>
                    <div class="metric-score" style="color: ${stability.score >= 80 ? '#10b981' : stability.score >= 60 ? '#f59e0b' : '#ef4444'}">${stability.score}</div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${stability.score}%; background: ${stability.score >= 80 ? '#10b981' : stability.score >= 60 ? '#f59e0b' : '#ef4444'}"></div>
                </div>
                <div class="metric-details">
                    Status: ${stability.details.status}<br>
                    ${stability.details.testsRun !== undefined ? 
                      `Tests: ${stability.details.testsPassed}/${stability.details.testsRun} passed (${stability.details.passRate}%)` : 
                      'Test results pending'}
                </div>
            </div>
        </div>
        
        <div class="legend">
            <h3>Scoring Formula</h3>
            <p><strong>Accessibility (40%)</strong>: WCAG 2.1 AA compliance, zero critical violations</p>
            <p><strong>Performance (35%)</strong>: Core Web Vitals (TBT < 300ms, FCP < 2200ms, CLS < 0.1)</p>
            <p><strong>Code Quality (15%)</strong>: Lint errors, TypeScript issues, console warnings</p>
            <p><strong>Stability (10%)</strong>: Test pass rate, error boundaries, graceful degradation</p>
        </div>
        
        <div class="timestamp">
            Last updated: ${new Date(this.timestamp).toLocaleString()}
        </div>
    </div>
</body>
</html>`;

    writeFileSync(join(CONFIG.PATHS.dashboard, 'index.html'), html);
    console.log(`📊 Dashboard generated: ${join(CONFIG.PATHS.dashboard, 'index.html')}`);
  }

  saveResults() {
    // Save current results
    const resultsFile = join(CONFIG.PATHS.reports, `quality-${Date.now()}.json`);
    writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
    
    // Update history
    const historyFile = join(CONFIG.PATHS.reports, 'quality-history.json');
    let history = [];
    if (existsSync(historyFile)) {
      try {
        history = JSON.parse(readFileSync(historyFile, 'utf8'));
      } catch (e) {
        history = [];
      }
    }
    
    history.push(this.results);
    
    // Keep last 30 entries
    if (history.length > 30) {
      history = history.slice(-30);
    }
    
    writeFileSync(historyFile, JSON.stringify(history, null, 2));
  }

  printSummary() {
    const { overall, accessibility, performance, codeQuality, stability } = this.results;
    
    console.log('\n🎯 BOOKIJI QUALITY INDEX SUMMARY');
    console.log('═'.repeat(50));
    console.log(`Overall Score: ${overall.score}/100 ${overall.grade}`);
    console.log(`Trend: ${overall.trend}\n`);
    
    console.log(`♿ Accessibility: ${accessibility.score}/100 (${accessibility.details.status})`);
    console.log(`🚀 Performance:  ${performance.score}/100 (${performance.details.status})`);
    console.log(`🔧 Code Quality: ${codeQuality.score}/100 (${codeQuality.details.status})`);
    console.log(`🛡️ Stability:    ${stability.score}/100 (${stability.details.status})`);
    
    console.log(`\n📊 Dashboard: ${join(CONFIG.PATHS.dashboard, 'index.html')}`);
    console.log(`📁 Reports: ${CONFIG.PATHS.reports}\n`);
    
    if (overall.score >= 90) {
      console.log('🏆 LEGENDARY QUALITY! Your platform is a fortress of excellence!');
    } else if (overall.score >= 80) {
      console.log('🌟 EXCELLENT QUALITY! Minor optimizations could push you to legendary status.');
    } else if (overall.score >= 70) {
      console.log('✨ GOOD QUALITY! Focus on the lowest scoring areas for maximum impact.');
    } else {
      console.log('⚠️ QUALITY NEEDS ATTENTION! Check the detailed breakdown for action items.');
    }
  }

  // Utility methods for parsing test outputs
  parseA11yOutput(output) {
    const violations = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('accessibility violations found')) {
        const match = line.match(/(\d+) accessibility violations found/);
        if (match) {
          const count = parseInt(match[1]);
          for (let i = 0; i < count; i++) {
            violations.push({ impact: 'unknown' }); // Simplified parsing
          }
        }
      }
    }
    
    return violations;
  }

  parseA11yPages(output) {
    const pages = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('No accessibility violations found on')) {
        const match = line.match(/No accessibility violations found on (.+)/);
        if (match) {
          pages.push({ name: match[1], status: 'pass' });
        }
      }
    }
    
    return pages;
  }

  parsePerfOutput(output) {
    const pages = [];
    let totalTBT = 0, totalFCP = 0, totalCLS = 0, pageCount = 0;
    
    const lines = output.split('\n');
    for (const line of lines) {
      const match = line.match(/\[perf\] (.+) :: TBT=(\d+)ms.*FCP=(\d+)ms.*CLS=([0-9.]+)/);
      if (match) {
        const [, pageName, tbt, fcp, cls] = match;
        const metrics = {
          name: pageName,
          TBT: parseInt(tbt),
          FCP: parseInt(fcp),
          CLS: parseFloat(cls)
        };
        
        pages.push(metrics);
        totalTBT += metrics.TBT;
        totalFCP += metrics.FCP;
        totalCLS += metrics.CLS;
        pageCount++;
      }
    }
    
    return {
      pages,
      avgTBT: pageCount > 0 ? Math.round(totalTBT / pageCount) : 0,
      avgFCP: pageCount > 0 ? Math.round(totalFCP / pageCount) : 0,
      avgCLS: pageCount > 0 ? Math.round((totalCLS / pageCount) * 1000) / 1000 : 0
    };
  }

  countLintIssues(output) {
    const errorMatch = output.match(/(\d+) error/);
    const warningMatch = output.match(/(\d+) warning/);
    
    return {
      errors: errorMatch ? parseInt(errorMatch[1]) : 0,
      warnings: warningMatch ? parseInt(warningMatch[1]) : 0
    };
  }

  countTypeIssues(output) {
    const lines = output.split('\n');
    return lines.filter(line => line.includes('error TS')).length;
  }

  parseTestOutput(output) {
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    
    return {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0
    };
  }

  runSafely(command) {
    try {
      return execSync(command, { encoding: 'utf8', timeout: 30000 });
    } catch (error) {
      return error.stdout || error.message || '';
    }
  }
}

// CLI interface
async function main() {
  try {
    console.log('🎯 Starting Bookiji Quality Index calculation...');
    const calculator = new QualityIndexCalculator();
    const results = await calculator.run();
    
    // Exit with appropriate code
    process.exit(results.overall.score >= 70 ? 0 : 1);
  } catch (error) {
    console.error('❌ Quality Index calculation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('quality-index.mjs')) {
  main().catch(console.error);
}

export { QualityIndexCalculator };
