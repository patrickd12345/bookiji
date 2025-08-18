# 🚀 Developer Onboarding Guide

Welcome to Bookiji! This guide will help you understand our quality system, development workflow, and how to contribute effectively.

## 🎯 Quality Philosophy

We believe in **progressive quality improvement** - every commit should make the codebase better, not worse. Our quality system is designed to:

- **Catch regressions early** - Automated testing on every PR
- **Provide actionable feedback** - Clear error messages and detailed reports
- **Enable rapid iteration** - Fast feedback loops for developers
- **Maintain high standards** - Gradual improvement without blocking progress

## 🏗️ Quality Architecture

### 1. **Critical vs Style Split**

Our quality checks are split into two categories:

#### 🚨 **Critical (Blocks CI)**
- **TypeScript compilation errors** - Must fix before merging
- **Failing tests** - Core functionality must work
- **Critical accessibility violations** - Legal compliance requirement
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
