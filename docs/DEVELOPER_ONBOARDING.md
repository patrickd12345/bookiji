# 🚀 Developer Onboarding Guide

Welcome to Bookiji! This guide will help you understand our quality system, development workflow, and how to contribute effectively.

## 🎯 Quality Philosophy

We believe in **progressive quality improvement** - every commit should make the codebase better, not worse. Our quality system is designed to:

- **Catch regressions early** - Automated testing on every PR
- **Provide actionable feedback** - Clear error messages and detailed reports
- **Enable rapid iteration** - Fast feedback loops for developers
- **Maintain high standards** - Gradual improvement without blocking progress

## 🏗️ Quality Architecture

### 1. **Four-Layer Defense System**

Our quality system uses **progressive enforcement** across four layers:

#### 🛡️ **Layer 1: Component Level**
- **Real-time dev warnings** - Components warn about accessibility issues
- **Button a11y enforcement** - Icon buttons must have aria-labels
- **Theme safety guards** - Prevent contrast regressions

#### 🛡️ **Layer 2: Pre-Commit**  
- **Static analysis** - Block naked icon buttons before they hit repo
- **Lint-staged** - Format and fix on commit
- **Warning debt tracking** - Measure improvement over time

#### 🛡️ **Layer 3: A11y Tests**
- **WCAG compliance** - Axe-core + Playwright under normal conditions
- **Accessibility scanning** - Critical violations block deployment
- **Screen reader compatibility** - Error states remain accessible

#### 🛡️ **Layer 4: Chaos Engineering** ⚡
- **UX contract enforcement** - Specific resilience requirements  
- **Network failure simulation** - Test graceful degradation
- **Resilience scoring** - Current: 20%, Target: 80%+

### 2. **Critical vs Style Split**

#### 🚨 **Critical (Blocks CI)**
- **TypeScript compilation errors** - Must fix before merging
- **Failing tests** - Core functionality must work
- **Critical accessibility violations** - Legal compliance requirement
- **UX contract violations** - Resilience patterns must work
- **Build failures** - App must deploy successfully

#### 🔧 **Style (Soft Nudge)**
- **ESLint warnings** - Code style and best practices
- **Performance regressions** - Should investigate but won't block
- **Minor accessibility issues** - Improve over time
- **Code coverage drops** - Aim for gradual improvement

### 2. **Automated Quality Gates**

```
PR Created → Quality Checks → Feedback → Fix → Merge
     ↓
├── TypeScript Compilation
├── Unit Tests (Vitest)
├── E2E Tests (Playwright)
├── Accessibility Audit
├── Performance Smoke Tests
├── Code Quality Analysis
└── Warning Debt Tracking
```

## 🧪 Testing Strategy

### **Unit Tests (Vitest)**
- **Location**: `src/**/*.test.ts` and `src/**/*.spec.ts`
- **Command**: `pnpm vitest run`
- **Goal**: Fast feedback on individual functions/components
- **Coverage**: Aim for >80% on critical paths

### **E2E Tests (Playwright)**
- **Location**: `packages/pw-tests/tests/`
- **Command**: `pnpm dlx @playwright/test test`
- **Goal**: Verify user workflows end-to-end
- **Scope**: Critical user journeys, accessibility, performance

### **Accessibility Tests**
- **Tool**: Axe-core with Playwright
- **Coverage**: WCAG 2.1 A/AA standards
- **Reports**: HTML + JSON artifacts for triage
- **Focus**: Screen readers, keyboard navigation, color contrast

### **Performance Tests**
- **Metrics**: LCP, FID, CLS, TTI, TBT
- **Thresholds**: 90-second completion time
- **Traces**: Detailed performance analysis
- **Focus**: Core Web Vitals and user experience

### **Automated QA Pipeline**
- **Tool**: Custom Playwright-based crawler and test generator
- **Coverage**: Automatic user journey discovery and validation
- **Accessibility**: WCAG compliance checking at every step
- **Reports**: Professional HTML dashboards with quality metrics
- **CI/CD**: Integrated with GitHub Actions and quality gates

## 🚀 **Automated QA Pipeline & CI/CD**

Our **enterprise-grade QA pipeline** automatically discovers, tests, and validates user journeys with comprehensive accessibility checking.

### **Pipeline Overview**

```
🔍 Crawl → 🔧 Generate → 🧪 Test → 📊 Report → 📢 Notify
```

1. **Site Crawling**: Automatically discovers user journeys, forms, and interactive elements
2. **Test Generation**: Creates comprehensive Playwright tests from discovered journeys
3. **Test Execution**: Runs tests with accessibility validation at every step
4. **Quality Reporting**: Generates professional HTML dashboards with metrics
5. **Team Notifications**: Slack and email alerts with quality insights

### **Quick Start Commands**

```bash
# Automated QA Pipeline
pnpm qa:pipeline     # Run complete pipeline
pnpm qa:crawl        # Site discovery only
pnpm qa:generate     # Test generation only  
pnpm qa:test         # Test execution only
pnpm qa:report       # Report generation only

# Chaos Engineering (Resilience Testing)
pnpm chaos:contracts # Test UX contract enforcement
pnpm chaos:light     # CI-safe chaos (must pass)
pnpm chaos:storm     # Stress testing (allowed failures)
pnpm chaos:taxonomy  # Analyze failure patterns
pnpm chaos:full      # Complete chaos suite + analysis

# Quality Monitoring
pnpm warning:debt    # Track technical debt trends
pnpm check:a11y-buttons # Pre-commit accessibility guard
```

### **Environment Configuration**

```bash
# Local development
BASE_URL=http://localhost:3000 pnpm qa:pipeline

# Staging environment  
BASE_URL=https://staging.bookiji.com pnpm qa:pipeline

# Production testing
BASE_URL=https://bookiji.com pnpm qa:pipeline

# Custom crawl depth
MAX_DEPTH=3 pnpm qa:pipeline
```

### **Quality Metrics & Gates**

- **Overall Score**: Weighted combination of coverage, accessibility, and functionality
- **Test Coverage**: Percentage of discovered elements covered by tests
- **Accessibility Score**: WCAG compliance with detailed violation reporting
- **Quality Gates**: 80% overall, 70% coverage, 90% accessibility

### **Pipeline Features**

- ✅ **Intelligent Discovery**: Quality-scored element filtering (high/medium/low)
- ✅ **Critical Path Identification**: 🚨 marks high-priority user flows
- ✅ **Enhanced Reliability**: Built-in retry logic and fallback selectors
- ✅ **Professional Reporting**: Beautiful HTML dashboards with recommendations
- ✅ **CI/CD Integration**: GitHub Actions with automated quality gates
- ✅ **Team Notifications**: Slack and email integration ready

### **Generated Test Structure**

```typescript
// Example generated test
test('🚨 Journey 1 - Homepage', async ({ page }) => {
  // Visit page
  await page.goto('http://localhost:3000');
  
  // Click element with accessibility check
  await safeClick(page, 'button:has-text("Get Started")');
  await runAccessibilityCheck(page, 1);
  
  // Fill form with validation
  await safeFill(page, 'input[name="email"]', 'test@example.com');
  await runAccessibilityCheck(page, 2);
});
```

### **Pipeline Outputs**

- **`crawl-output.json`**: Discovered user journeys and elements
- **`tests/generated.spec.ts`**: Auto-generated Playwright tests
- **`qa-pipeline-report.json`**: Machine-readable quality metrics
- **`qa-pipeline-report.html`**: Professional visual dashboard
- **`test-results/`**: Screenshots and test execution artifacts

### **CI/CD Integration**

Our QA pipeline is fully integrated with GitHub Actions for automated quality assurance:

#### **Automated Triggers**
- **Every PR**: Quality gates block merges below thresholds
- **Every Push**: Continuous quality monitoring
- **Daily Schedule**: Automated testing at 2 AM UTC
- **Manual Trigger**: On-demand testing for any environment

#### **Quality Gates**
```yaml
# Quality thresholds (configurable)
Overall Score:     ≥ 80%  # Blocks deployment
Test Coverage:     ≥ 70%  # Blocks deployment  
Accessibility:     ≥ 90%  # Blocks deployment
```

#### **Environment Support**
- **Local**: Development and testing
- **Staging**: Pre-production validation
- **Production**: Live site monitoring

#### **PR Integration**
- **Automatic Comments**: Quality scores and recommendations
- **Quality Gates**: Blocks merges below thresholds
- **Artifact Uploads**: Test results and reports
- **Team Notifications**: Slack and email alerts

#### **GitHub Actions Workflow**
```yaml
# .github/workflows/qa-pipeline.yml
name: Bookiji QA Pipeline
on: [push, pull_request, schedule]
jobs:
  - qa-pipeline: Crawl, test, and validate
  - quality-gate: Check quality thresholds
  - notify-team: Send results and alerts
```

---

## 🎯 **QA Pipeline Best Practices**

### **Development Workflow Integration**

#### **Daily Development**
```bash
# Morning: Check quality status
pnpm qa:report

# During development: Quick validation
pnpm qa:crawl  # Discover new elements

# Before commit: Full validation
pnpm qa:pipeline
```

#### **Feature Development**
```bash
# Start new feature
pnpm qa:crawl  # Baseline current state

# Develop feature...
# Add new components, pages, forms

# Validate feature
pnpm qa:generate  # Generate tests for new elements
pnpm qa:test      # Run validation
```

#### **Release Preparation**
```bash
# Pre-release validation
BASE_URL=https://staging.bookiji.com pnpm qa:pipeline

# Production validation
BASE_URL=https://bookiji.com pnpm qa:pipeline

# Quality gate check
cat qa-pipeline-report.json | jq '.status'
```

### **Configuration Management**

#### **Environment-Specific Settings**
```bash
# Development
BASE_URL=http://localhost:3000 MAX_DEPTH=2 pnpm qa:pipeline

# Staging  
BASE_URL=https://staging.bookiji.com MAX_DEPTH=3 pnpm qa:pipeline

# Production
BASE_URL=https://bookiji.com MAX_DEPTH=1 pnpm qa:pipeline
```

#### **Quality Thresholds**
```bash
# Stricter thresholds for production
QUALITY_OVERALL=90 QUALITY_COVERAGE=80 QUALITY_ACCESSIBILITY=95 pnpm qa:pipeline

# Relaxed thresholds for development
QUALITY_OVERALL=70 QUALITY_COVERAGE=50 QUALITY_ACCESSIBILITY=80 pnpm qa:pipeline
```

### **Team Collaboration**

#### **Quality Reviews**
- **Review generated tests** before committing
- **Analyze accessibility violations** for UX improvements
- **Track quality trends** over time
- **Share quality reports** with stakeholders

#### **Continuous Improvement**
- **Monitor quality metrics** in CI/CD
- **Address failing quality gates** promptly
- **Optimize pipeline performance** based on usage
- **Expand test coverage** for critical paths

---

## 🔧 **QA Pipeline Troubleshooting**

### **Common Issues & Solutions**

#### **Pipeline Won't Start**
```bash
# Check if scripts are available
pnpm qa:help

# Verify dependencies
pnpm install

# Check Playwright installation
pnpm exec playwright install --with-deps chromium
```

#### **Crawling Issues**
```bash
# Check if app is running
curl http://localhost:3000

# Increase timeout for slow pages
MAX_DEPTH=1 pnpm qa:crawl

# Debug crawling process
DEBUG=true pnpm qa:crawl
```

#### **Test Generation Failures**
```bash
# Check crawl output exists
ls -la crawl-output.json

# Regenerate from scratch
rm crawl-output.json && pnpm qa:crawl && pnpm qa:generate
```

#### **Test Execution Problems**
```bash
# Check Playwright configuration
cat playwright.config.ts

# Run with verbose output
pnpm test:e2e --reporter=list --debug

# Check test results directory
ls -la test-results/
```

#### **Quality Gate Failures**
```bash
# Check quality metrics
cat qa-pipeline-report.json | jq '.qualityMetrics'

# Review recommendations
cat qa-pipeline-report.json | jq '.recommendations'

# Regenerate reports
pnpm qa:report
```

### **Performance Optimization**

#### **Faster Crawling**
```bash
# Reduce crawl depth
MAX_DEPTH=1 pnpm qa:pipeline

# Focus on critical paths only
CRITICAL_ONLY=true pnpm qa:pipeline
```

#### **Parallel Execution**
```bash
# Run tests in parallel
pnpm test:e2e --workers=4

# Use multiple browser contexts
BROWSER_CONTEXTS=3 pnpm qa:pipeline
```

---

## 🔄 Development Workflow

### **1. Local Development**
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run quality checks locally
pnpm lint          # ESLint + Prettier
pnpm type-check    # TypeScript compilation
pnpm test          # Unit tests
pnpm test:e2e      # E2E tests (requires dev server)
```

### **2. Pre-commit Quality**
```bash
# Run all quality checks
pnpm quality-check

# This runs:
# - Linting
# - Type checking
# - Unit tests
# - Warning debt analysis
```

### **3. Automated QA Pipeline**
```bash
# Run complete QA pipeline locally
pnpm qa:pipeline

# This runs:
# - Site crawling and journey discovery
# - Test generation from discovered elements
# - Test execution with accessibility validation
# - Quality reporting and recommendations
# - Team notifications (if configured)
```

### **3. Pull Request Process**
1. **Create feature branch** from `main`
2. **Make changes** with regular commits
3. **Push and create PR** - triggers automated checks
4. **Address feedback** from quality gates
5. **Merge** when all critical checks pass

## 📊 Quality Metrics & Reports

### **Warning Debt Burn-down**
```bash
# Analyze technical debt trends
node scripts/warning-debt-burn-down.mjs
```
- Tracks warnings by category and severity
- Shows improvement trends over time
- Provides actionable recommendations

### **Quality Badges**
```bash
# Generate README quality status
node scripts/generate-quality-badges.mjs
```
- Visual status indicators for tests, a11y, performance
- Overall health score (0-100)
- Detailed breakdown of each metric

### **Accessibility Reports**
- **HTML reports**: Human-readable violation details
- **JSON reports**: Machine-readable for CI integration
- **Screenshots**: Visual context for violations
- **Trend analysis**: Track improvements over time

### **Performance Traces**
- **Chrome DevTools integration**: `npx playwright show-trace <file>`
- **Timeline analysis**: Identify bottlenecks
- **Resource loading**: Network and rendering performance
- **Memory usage**: Detect memory leaks

## 🚨 Handling Quality Issues

### **TypeScript Errors**
```bash
# Quick type check
pnpm type-check

# Fix common issues
pnpm lint --fix
```

**Common fixes:**
- Add missing type annotations
- Fix import/export issues
- Resolve interface mismatches

### **Test Failures**
```bash
# Run specific test file
pnpm vitest run src/components/Button.test.ts

# Run with watch mode
pnpm vitest src/components/Button.test.ts

# Debug failing test
pnpm vitest run --reporter=verbose
```

**Debugging tips:**
- Check test data setup
- Verify component props
- Look for async timing issues

### **Accessibility Violations**
```bash
# Run a11y tests locally
pnpm dlx @playwright/test test tests/a11y/

# Check specific page
DIALOG_TEST_PATH=/login pnpm dlx @playwright/test test tests/a11y/
```

**Common fixes:**
- Add missing `alt` attributes
- Fix color contrast ratios
- Add proper ARIA labels
- Ensure keyboard navigation

---

## 📚 **Additional Resources**

### **QA Pipeline Documentation**
- **Complete Guide**: [`docs/QA_PIPELINE_COMPLETE.md`](QA_PIPELINE_COMPLETE.md) - Comprehensive implementation details
- **Pipeline Scripts**: `scripts/qa-pipeline.mjs` - Main orchestration script
- **GitHub Actions**: `.github/workflows/qa-pipeline.yml` - CI/CD integration
- **Generated Tests**: `tests/generated.spec.ts` - Auto-generated test suites

### **Quality System Architecture**
- **Testing Strategy**: Unit, E2E, accessibility, and performance testing
- **Quality Gates**: Configurable thresholds and deployment blocking
- **CI/CD Pipeline**: Automated quality assurance on every change
- **Monitoring & Reporting**: Professional dashboards and team notifications

### **Getting Help**
- **Pipeline Issues**: Check troubleshooting section above
- **Quality Gates**: Review `qa-pipeline-report.json` for detailed metrics
- **Team Support**: Use generated reports to communicate quality status
- **Continuous Improvement**: Monitor trends and optimize based on usage data

### **Performance Issues**
```bash
# Run performance tests
pnpm dlx @playwright/test test tests/performance/

# Analyze traces
npx playwright show-trace test-results/performance-traces/*.zip
```

**Optimization areas:**
- Bundle size reduction
- Image optimization
- Lazy loading implementation
- Memory leak fixes

## 🛠️ Quality Tools & Commands

### **Linting & Formatting**
```bash
pnpm lint              # ESLint + Prettier
pnpm lint --fix        # Auto-fix issues
pnpm format            # Prettier only
pnpm format:check      # Check formatting
```

### **Type Checking**
```bash
pnpm type-check        # Full TypeScript check
pnpm type-check:watch  # Watch mode for development
```

### **Testing**
```bash
pnpm test              # Unit tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
pnpm test:e2e          # E2E tests
pnpm test:a11y         # Accessibility tests
pnpm test:performance  # Performance tests
```

### **Quality Analysis**
```bash
# Warning debt analysis
node scripts/warning-debt-burn-down.mjs

# Quality badge generation
node scripts/generate-quality-badges.mjs

# Performance profiling
node scripts/analyze-performance.mjs
```

## 📚 Best Practices

### **Code Quality**
- **Write self-documenting code** - Clear variable names, small functions
- **Follow TypeScript best practices** - Avoid `any`, use proper types
- **Keep functions focused** - Single responsibility principle
- **Add meaningful comments** - Explain "why", not "what"

### **Testing**
- **Test behavior, not implementation** - Focus on user outcomes
- **Use descriptive test names** - Clear what's being tested
- **Mock external dependencies** - Isolate units under test
- **Test edge cases** - Error conditions, boundary values

### **Accessibility**
- **Test with screen readers** - Real user experience
- **Verify keyboard navigation** - Tab order, focus management
- **Check color contrast** - Use tools like WebAIM
- **Follow WCAG guidelines** - 2.1 A/AA standards

### **Performance**
- **Measure before optimizing** - Profile to find bottlenecks
- **Optimize critical path** - Above-the-fold content first
- **Monitor Core Web Vitals** - LCP, FID, CLS
- **Test on slow devices** - Real-world conditions

## 🔍 Troubleshooting

### **Common Issues**

#### **Tests failing in CI but passing locally**
- Check environment variables
- Verify dependency versions
- Look for timing issues
- Check for platform-specific code

#### **TypeScript errors in CI**
- Run `pnpm type-check` locally
- Check for missing type definitions
- Verify import/export paths
- Look for conditional types

#### **Performance tests timing out**
- Check network conditions
- Verify test data size
- Look for infinite loops
- Check for memory leaks

#### **Accessibility violations**
- Run axe-core locally
- Check for dynamic content
- Verify ARIA attributes
- Test with different screen readers

### **Getting Help**
1. **Check existing issues** - GitHub Issues, discussions
2. **Review documentation** - This guide, API docs, component docs
3. **Ask in team chat** - Quick questions and clarifications
4. **Create detailed issue** - Include steps, environment, logs

## 🎉 Success Metrics

### **Individual Developer**
- ✅ All local quality checks pass
- ✅ PRs merge without blocking issues
- ✅ Tests added for new features
- ✅ Accessibility considered in design

### **Team**
- ✅ CI/CD pipeline stays green
- ✅ Warning debt decreases over time
- ✅ Performance metrics improve
- ✅ Accessibility score increases

### **Product**
- ✅ Users report fewer bugs
- ✅ Performance scores improve
- ✅ Accessibility compliance achieved
- ✅ Development velocity increases

## 🚀 Next Steps

1. **Set up your environment** - Follow the quick start guide
2. **Run quality checks locally** - Ensure everything passes
3. **Pick a small issue** - Start with good first issues
4. **Ask questions** - Team is here to help
5. **Contribute improvements** - Share your knowledge

---

**Remember**: Quality is a journey, not a destination. Every improvement, no matter how small, makes Bookiji better for our users and developers.

**Questions?** Reach out to the team or check our [contributing guidelines](../CONTRIBUTING.md).
