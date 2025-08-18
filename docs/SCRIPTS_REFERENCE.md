# 📋 Scripts Reference

## 🏆 Quality Index Commands

```bash
# Generate quality assessment and dashboard
pnpm quality:index

# Generate dashboard with path info  
pnpm quality:dashboard
```

## 🧪 Testing Commands

```bash
# Accessibility tests
pnpm test:a11y           # WCAG 2.1 AA compliance tests
pnpm test:a11y-dialog    # Dialog focus trap tests (when dialogs exist)

# Performance tests  
pnpm test:perf          # Core Web Vitals budget enforcement
pnpm perf:lhci          # Deep Lighthouse audit with traces

# General testing
pnpm test:pw            # All Playwright tests
pnpm test:smoke         # Quick smoke tests
pnpm test:unit          # Unit tests (Vitest)
pnpm test:e2e           # End-to-end tests
```

## 🚀 QA Pipeline Commands

```bash
# Complete QA pipeline
pnpm qa:pipeline        # Run complete quality assessment

# Individual phases
pnpm qa:crawl           # Discover user journeys
pnpm qa:generate        # Generate tests
pnpm qa:test            # Execute tests
pnpm qa:report          # Generate reports
pnpm qa:help            # Show help
```

## 🛠️ Development Commands

```bash
# Development server
pnpm dev               # Start development server

# Code quality
pnpm lint              # ESLint checks
pnpm lint:crit         # Critical lint issues only
pnpm typecheck         # TypeScript type checking
pnpm format            # Prettier formatting

# Build and deployment
pnpm build             # Production build
pnpm start             # Start production server
pnpm ci                # Full CI pipeline (lint + type + test + e2e)
```

## 📊 Reporting Commands

```bash
# Quality metrics
pnpm quality:index     # Generate quality dashboard
pnpm digest:weekly     # Weekly quality digest

# Test reporting
pnpm test:visual       # Visual regression tests
pnpm test:performance  # Performance tests with reporting
```

## 🔧 Maintenance Commands  

```bash
# Dependencies
pnpm install           # Install dependencies
pnpm update            # Update dependencies

# Database
pnpm db:setup          # Setup database
pnpm db:migrate        # Run migrations

# Code cleanup
pnpm codemod:unused    # Remove unused variables
pnpm codemod:any       # Convert any to unknown
pnpm codemod:auto      # Run all codemods
```

## ⚡ Quick Commands for Common Tasks

```bash
# Pre-commit check
pnpm lint && pnpm typecheck && pnpm test:unit

# Quality gate check  
pnpm quality:index

# Full local validation
pnpm ci

# Performance check
pnpm test:perf && pnpm perf:lhci

# Accessibility validation
pnpm test:a11y
```

---

For detailed information about each command, see the respective documentation:
- [Quality Index](./QUALITY_INDEX.md)
- [QA Pipeline](./QA_PIPELINE_QUICK_REFERENCE.md)
- [API Guide](./API_GUIDE.md)
