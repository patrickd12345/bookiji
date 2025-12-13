# 👨‍💻 Development

Developer guides, setup instructions, and technical architecture.

## 📚 Available Guides

### 🏗️ Architecture & Design
- [Modern NextJS Setup](../MODERN_NEXTJS_SETUP.md) - Next.js 15 setup and configuration
- [Wireframes](../WIREFRAMES.md) - UI/UX wireframes and design
- [Brand Guidelines](../BRAND_GUIDELINES.md) - Design system and branding
- [Conditional Buttons Implementation](../CONDITIONAL_BUTTONS_IMPLEMENTATION.md) - UI component implementation

### 🔧 Development Setup
- [Quick Setup](../QUICK_SETUP.md) - Developer environment setup
- [Components README](../src/components/README.md) - Component library documentation
- [Tests README](../tests/README.md) - Testing framework and procedures

### 📊 Testing & Quality
- [Test Plan](../TEST_PLAN.md) - Testing strategy and procedures
- [Test Results Dashboard](../TEST_RESULTS_DASHBOARD.md) - Test execution results
- [Comprehensive UI Testing Strategy](../COMPREHENSIVE_UI_TESTING_STRATEGY.md) - UI testing approach
- [Testing Guide](./TESTING_GUIDE.md) - Supabase mocks, patterns, and debugging tips
- [Testing Phase 2 TODOs](../TESTING_PHASE_2_TODOS.md) - Testing roadmap

### 🚀 Features & Implementation
- [Dynamic Broadcasting Implementation Summary](../DYNAMIC_BROADCASTING_IMPLEMENTATION_SUMMARY.md) - Broadcasting system
- [Customer Review System Enhancement Summary](../CUSTOMER_REVIEW_SYSTEM_ENHANCEMENT_SUMMARY.md) - Review system
- [Bookiji Native Calendar MVP](../bookiji-native-calendar-mvp.md) - Calendar system
- [Global Fairness System](../GLOBAL_FAIRNESS_SYSTEM.md) - Fairness algorithms

## 🛠️ Development Tools

### Core Technologies
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Database**: PostgreSQL with Supabase
- **Testing**: Vitest, Playwright
- **CI/CD**: GitHub Actions

### Development Commands
```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Build
pnpm build

# Testing
pnpm test:run
pnpm e2e

# Linting
pnpm lint

# Type checking
pnpm type-check
```

## 📁 Project Structure

```
src/
├── app/           # Next.js app router pages
├── components/    # React components
├── lib/          # Utility libraries
├── hooks/        # Custom React hooks
├── stores/       # State management
└── types/        # TypeScript type definitions
```

## 🔄 Development Workflow

1. **Setup**: Follow [Quick Setup](../QUICK_SETUP.md)
2. **Development**: Use `pnpm dev` for local development
3. **Testing**: Run tests before committing
4. **Code Quality**: Ensure linting and type checking pass
5. **Documentation**: Update relevant docs when adding features

---

*Start with [Quick Setup](../QUICK_SETUP.md) to get your development environment ready.*
