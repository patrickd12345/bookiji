# Comprehensive Test Plan

## Overview

This document outlines the complete testing strategy for the Bookiji platform. It covers all testing levels, types, and requirements to ensure quality, reliability, and maintainability.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Types & Levels](#test-types--levels)
3. [Test Organization](#test-organization)
4. [Testing Requirements by Feature Type](#testing-requirements-by-feature-type)
5. [Test Execution Strategy](#test-execution-strategy)
6. [Test Coverage Requirements](#test-coverage-requirements)
7. [Continuous Integration](#continuous-integration)
8. [Test Maintenance](#test-maintenance)

---

## Testing Philosophy

### Core Principles

1. **Test Pyramid**: Prioritize unit tests (fast, many), integration tests (moderate, some), and E2E tests (slow, few)
2. **Test Isolation**: Each test should be independent and not rely on other tests
3. **Deterministic Tests**: Tests must produce consistent results across runs
4. **Fast Feedback**: Critical paths should have fast-running tests
5. **Real-World Scenarios**: E2E tests should mirror actual user workflows
6. **Optimistic UI**: Tests should verify optimistic updates with rollback capabilities
7. **Guard Against Double Clicks**: Tests should verify idempotency where applicable

### Testing Tools

- **Unit/Integration**: Vitest
- **E2E**: Playwright
- **Contract Tests**: Playwright (API-level)
- **Load Tests**: k6
- **Visual Regression**: Playwright screenshots
- **Accessibility**: Playwright + axe-core

---

## Test Types & Levels

### 1. Unit Tests (`tests/unit/`)

**Purpose**: Test individual functions, components, and utilities in isolation.

**Coverage**:
- Pure functions and utilities
- Business logic
- Data transformations
- Validation logic
- Helper functions

**Requirements**:
- Fast execution (< 100ms per test)
- No external dependencies (mocked)
- High code coverage (> 80%)
- Clear test names describing behavior

**Example Locations**:
- `tests/unit/reasoning/` - Reasoning orchestration logic
- `tests/unit/` - General utility functions

**Running**:
```bash
pnpm test tests/unit/
```

---

### 2. Component Tests (`tests/components/`)

**Purpose**: Test React components and hooks in isolation.

**Coverage**:
- Component rendering
- User interactions
- State management
- Props handling
- Hook behavior

**Requirements**:
- Use React Testing Library
- Test user-visible behavior, not implementation
- Mock external dependencies
- Test accessibility attributes

**Running**:
```bash
pnpm test tests/components/
```

---

### 3. API Tests (`tests/api/`)

**Purpose**: Test Next.js API route handlers.

**Coverage**:
- Request/response handling
- Authentication/authorization
- Input validation
- Error handling
- Database operations (mocked)
- Edge cases

**Requirements**:
- Mock Supabase client (`tests/utils/supabase-mocks.ts`)
- Mock `next/headers` for cookies
- Test all HTTP methods (GET, POST, PUT, DELETE)
- Verify response status codes and data
- Test error scenarios

**Example Locations**:
- `tests/api/blocks.spec.ts` - Block management API
- `tests/api/` - All API route handlers

**Running**:
```bash
pnpm test tests/api/
```

---

### 4. Integration Tests (`tests/integration/`)

**Purpose**: Test multiple components/services working together without full E2E.

**Coverage**:
- Service interactions
- Database operations (in-process)
- Business workflows
- State transitions
- Cross-module functionality

**Requirements**:
- Fast execution (no browser)
- In-process testing
- Can use real Supabase client (test DB)
- Test complete workflows

**Example Locations**:
- `tests/integration/bookingFlow.spec.ts` - Booking workflow
- `tests/integration/simcity.*.spec.ts` - SimCity control plane
- `tests/integration/reasoning.orchestration.spec.ts` - Reasoning flows

**Running**:
```bash
pnpm test:integration
```

---

### 5. Contract Tests (`tests/contracts/`)

**Purpose**: Verify API contracts and service interfaces.

**Coverage**:
- API request/response schemas
- Service adapter interfaces
- Event payloads
- Notification contracts
- External service integrations

**Requirements**:
- Fast and deterministic
- No screenshots/videos/traces
- Verify data structures
- Test backward compatibility

**Example Locations**:
- `tests/contracts/analytics/` - Analytics contracts
- `tests/contracts/notifications/` - Notification contracts
- `tests/contracts/simcity/` - SimCity contracts
- `tests/contracts/trust/` - Trust system contracts

**Running**:
```bash
pnpm contract
```

---

### 6. E2E Tests (`tests/e2e/`)

**Purpose**: Test complete user workflows in a real browser environment.

**Coverage**:
- Critical user journeys
- Cross-browser compatibility
- Real user interactions
- Full stack integration
- Payment flows
- Authentication flows

**Requirements**:
- Use Playwright fixtures (`tests/fixtures/base.ts`)
- Test happy paths and error scenarios
- Verify UI state changes
- Test optimistic UI updates
- Guard against race conditions

**Critical Flows to Test**:
- **Booking Flow**: Search → Choose Provider → Select Time → Payment → Confirmation
- **Authentication**: Registration → Login → Password Reset → Email Verification
- **Admin Functions**: Dashboard → Analytics → User Management
- **Provider Functions**: Calendar → Schedule → Requests → Reviews
- **Customer Functions**: Bookings → Favorites → Profile → Settings

**Example Locations**:
- `tests/e2e/booking-flow.spec.ts` - Complete booking journey
- `tests/e2e/auth.spec.ts` - Authentication flows
- `tests/e2e/admin-*.spec.ts` - Admin functionality
- `tests/e2e/payment-errors.spec.ts` - Payment error handling

**Running**:
```bash
pnpm e2e              # Headless
pnpm e2e:ui           # Headed with UI
pnpm e2e:debug        # Debug mode
```

---

### 7. Visual Regression Tests (`tests/visual/`)

**Purpose**: Detect unintended visual changes.

**Coverage**:
- Key pages and components
- Different viewport sizes
- Light/dark themes
- Critical UI states

**Requirements**:
- Screenshot comparison
- Update snapshots when intentional changes are made
- Test responsive layouts
- Test theme variations

**Example Locations**:
- `tests/visual/home.spec.ts` - Homepage visual tests

**Running**:
```bash
pnpm e2e tests/visual/
```

---

### 8. Accessibility Tests (`tests/a11y/`)

**Purpose**: Ensure the application is accessible to all users.

**Coverage**:
- ARIA attributes
- Keyboard navigation
- Screen reader compatibility
- Focus management
- Color contrast
- Semantic HTML

**Requirements**:
- Use axe-core for automated checks
- Manual keyboard navigation tests
- Focus trap verification
- Skip link functionality
- Landmark navigation

**Example Locations**:
- `tests/a11y/` - All accessibility tests
- `tests/a11y-*.spec.ts` - Top-level a11y tests

**Running**:
```bash
pnpm e2e tests/a11y/
```

---

### 9. Security Tests (`tests/security/`)

**Purpose**: Verify security measures and prevent vulnerabilities.

**Coverage**:
- RLS (Row Level Security) policies
- Authentication/authorization
- CSRF protection
- XSS prevention
- SQL injection prevention
- Security headers
- Content Security Policy (CSP)

**Requirements**:
- Test unauthorized access attempts
- Verify RLS policies
- Test security headers
- Verify CSP compliance
- Test input sanitization

**Example Locations**:
- `tests/security/rls.spec.ts` - Database security
- `tests/security/security.headers.spec.ts` - HTTP headers
- `tests/security/csp.spec.ts` - Content Security Policy

**Running**:
```bash
pnpm e2e tests/security/
```

---

### 10. Performance Tests (`tests/perf/`)

**Purpose**: Ensure acceptable performance characteristics.

**Coverage**:
- Page load times
- API response times
- Critical path performance
- Resource usage

**Requirements**:
- Set performance budgets
- Test under realistic conditions
- Monitor Core Web Vitals
- Test with realistic data volumes

**Example Locations**:
- `tests/perf/booking.spec.ts` - Booking flow performance
- `tests/perf/smoke.spec.ts` - General performance smoke tests

**Running**:
```bash
pnpm e2e tests/perf/
```

---

### 11. Load Tests (`loadtests/`)

**Purpose**: Test system behavior under load.

**Coverage**:
- Concurrent user scenarios
- API rate limiting
- Database performance under load
- Resource exhaustion scenarios

**Requirements**:
- Use k6 for load testing
- Test realistic user patterns
- Monitor system metrics
- Identify bottlenecks

**Example Locations**:
- `loadtests/booking-flow.k6.js` - Booking flow load test

**Running**:
```bash
pnpm loadtest
```

---

### 12. Chaos Tests (`tests/chaos/`)

**Purpose**: Test system resilience and failure handling.

**Coverage**:
- Service failures
- Network issues
- Database failures
- External service failures
- Recovery scenarios

**Requirements**:
- Simulate failures
- Verify graceful degradation
- Test retry mechanisms
- Verify error handling

**Running**:
```bash
pnpm chaos
```

---

### 13. Smoke Tests

**Purpose**: Quick verification that critical functionality works.

**Coverage**:
- Basic navigation
- Authentication
- Key features
- API health checks

**Example Locations**:
- `tests/e2e/production-smoke.spec.ts` - Production smoke tests
- `tests/e2e/admin-smoke.spec.ts` - Admin smoke tests
- `tests/synthetics/smoke.spec.ts` - Synthetic monitoring

**Running**:
```bash
pnpm e2e tests/e2e/*smoke*.spec.ts
```

---

## Test Organization

### Directory Structure

```
tests/
├── unit/              # Unit tests (Vitest)
├── components/        # Component tests (Vitest + Testing Library)
├── api/               # API route tests (Vitest)
├── integration/       # Integration tests (Vitest)
├── contracts/         # Contract tests (Playwright)
├── e2e/              # E2E tests (Playwright)
├── visual/           # Visual regression tests (Playwright)
├── a11y/             # Accessibility tests (Playwright)
├── security/         # Security tests (Playwright)
├── perf/             # Performance tests (Playwright)
├── chaos/            # Chaos tests (Playwright)
├── helpers/          # Test helpers
├── utils/            # Test utilities
└── fixtures/         # Playwright fixtures
```

### Naming Conventions

- **Unit/Integration/API**: `*.spec.ts`
- **Component**: `*.test.tsx` or `*.spec.tsx`
- **E2E**: `*.spec.ts`
- **Descriptive names**: `booking-flow.spec.ts`, `auth.spec.ts`, `admin-dashboard.spec.ts`

---

## Testing Requirements by Feature Type

### New Feature Checklist

When creating a new feature, ensure tests are added for:

#### 1. **API Endpoints** (`src/app/api/`)
- [ ] Unit tests for route handlers (`tests/api/`)
- [ ] Input validation tests
- [ ] Authentication/authorization tests
- [ ] Error handling tests
- [ ] Edge case tests
- [ ] Contract tests if external-facing (`tests/contracts/`)

#### 2. **UI Components** (`src/components/`)
- [ ] Component tests (`tests/components/`)
- [ ] Accessibility tests (`tests/a11y/`)
- [ ] Visual regression tests if significant UI (`tests/visual/`)
- [ ] Integration with parent components

#### 3. **Pages** (`src/app/`)
- [ ] E2E tests for user flows (`tests/e2e/`)
- [ ] Accessibility tests
- [ ] Visual regression tests for key pages
- [ ] SEO tests if public-facing (`tests/seo-*.spec.ts`)

#### 4. **Business Logic** (`src/lib/`, `src/services/`)
- [ ] Unit tests (`tests/unit/`)
- [ ] Integration tests (`tests/integration/`)
- [ ] Error handling tests
- [ ] Edge case tests

#### 5. **Database Operations**
- [ ] RLS policy tests (`tests/security/rls.spec.ts`)
- [ ] Migration tests (verify migrations work)
- [ ] Data integrity tests
- [ ] Performance tests for queries

#### 6. **External Integrations**
- [ ] Contract tests (`tests/contracts/`)
- [ ] Mock tests for development
- [ ] Integration tests with test credentials
- [ ] Error handling tests

#### 7. **Authentication/Authorization**
- [ ] E2E auth flow tests (`tests/e2e/auth.spec.ts`)
- [ ] Security tests (`tests/security/`)
- [ ] RLS policy tests
- [ ] Session management tests

#### 8. **Payment Processing**
- [ ] E2E payment flow (`tests/e2e/booking-flow.spec.ts`)
- [ ] Payment error handling (`tests/e2e/payment-errors.spec.ts`)
- [ ] Webhook tests (`tests/webhook-roundtrip.spec.ts`)
- [ ] Stripe integration tests

#### 9. **Notifications**
- [ ] Contract tests (`tests/contracts/notifications/`)
- [ ] E2E notification delivery tests
- [ ] Retry mechanism tests (`tests/lib/notificationRetry.spec.ts`)

#### 10. **Admin Features**
- [ ] Admin guard tests (`tests/admin-guard.spec.ts`)
- [ ] E2E admin flow tests (`tests/e2e/admin-*.spec.ts`)
- [ ] Authorization tests
- [ ] Analytics tests

---

## Test Execution Strategy

### Local Development

1. **During Development**:
   ```bash
   pnpm test --watch          # Watch mode for unit/component tests
   pnpm e2e:ui                # Run E2E tests with UI
   ```

2. **Before Committing**:
   ```bash
   pnpm test:run              # Run all unit/integration tests
   pnpm e2e                   # Run E2E tests
   pnpm lint                  # Run linter
   pnpm type-check            # Type checking
   ```

3. **Before Merging**:
   ```bash
   pnpm test:run              # All unit/integration tests
   pnpm e2e                   # All E2E tests
   pnpm contract              # Contract tests
   pnpm loadtest              # Load tests (if applicable)
   ```

### CI/CD Pipeline

Tests should run in CI/CD:
1. **On Pull Request**: All unit, integration, API, and E2E tests
2. **On Merge**: Full test suite + load tests
3. **Scheduled**: Smoke tests, security tests, performance tests

### Test Execution Order

1. **Fast Tests First**: Unit → Component → API → Integration
2. **Slow Tests Second**: E2E → Visual → Performance
3. **Specialized Tests**: Contract → Security → Load → Chaos

---

## Test Coverage Requirements

### Minimum Coverage Targets

- **Unit Tests**: > 80% code coverage
- **Critical Paths**: > 95% coverage
- **Business Logic**: > 90% coverage
- **API Routes**: > 85% coverage

### Coverage Exclusions

- Generated code
- Type definitions
- Test utilities
- Configuration files

---

## Continuous Integration

### Pre-commit Hooks

- Linting (`pnpm lint`)
- Type checking (`pnpm type-check`)
- Fast tests (`pnpm test:fast`)

### CI Pipeline

1. **Install Dependencies**
2. **Lint & Type Check**
3. **Run Unit/Integration Tests**
4. **Run E2E Tests**
5. **Run Contract Tests**
6. **Generate Coverage Report**
7. **Run Security Tests**
8. **Deploy to Preview Environment**

---

## Test Maintenance

### Regular Maintenance Tasks

1. **Update Tests When Features Change**
   - Update related tests when modifying features
   - Remove obsolete tests
   - Update test data

2. **Review Flaky Tests**
   - Identify and fix flaky tests
   - Add retries where appropriate
   - Improve test stability

3. **Update Test Data**
   - Keep test fixtures current
   - Update mocks to match API changes
   - Refresh test databases

4. **Performance Monitoring**
   - Track test execution time
   - Optimize slow tests
   - Parallelize where possible

5. **Coverage Monitoring**
   - Track coverage trends
   - Identify untested code
   - Add tests for critical gaps

### Test Review Checklist

When reviewing PRs, verify:
- [ ] Tests are included for new features
- [ ] Tests are updated for modified features
- [ ] Tests follow naming conventions
- [ ] Tests are isolated and independent
- [ ] Tests have clear descriptions
- [ ] Edge cases are covered
- [ ] Error scenarios are tested
- [ ] Tests are not flaky
- [ ] Test execution time is reasonable

---

## Feature-Specific Test Requirements

### Booking System

**Required Tests**:
- [ ] E2E booking flow (`tests/e2e/booking-flow.spec.ts`)
- [ ] Booking reschedule (`tests/e2e/booking-reschedule.spec.ts`)
- [ ] Payment processing (`tests/e2e/booking-flow.spec.ts`)
- [ ] Booking engine logic (`tests/lib/bookingEngine.spec.ts`)
- [ ] Atomic booking claim (`tests/integration/bookingFlow.spec.ts`)
- [ ] Slot consistency (`tests/e2e/scheduling-*.spec.ts`)

### Authentication System

**Required Tests**:
- [ ] Registration flow (`tests/e2e/auth.spec.ts`)
- [ ] Login flow (`tests/e2e/auth.spec.ts`)
- [ ] Password reset (`tests/integration/forgot-password-flow.spec.ts`)
- [ ] Email verification (`tests/e2e/auth.spec.ts`)
- [ ] Session management
- [ ] RLS policies (`tests/security/rls.spec.ts`)

### Admin Dashboard

**Required Tests**:
- [ ] Admin access control (`tests/admin-guard.spec.ts`)
- [ ] Admin smoke tests (`tests/e2e/admin-smoke.spec.ts`)
- [ ] Admin E2E flows (`tests/e2e/admin-*.spec.ts`)
- [ ] Analytics display
- [ ] User management

### Provider Features

**Required Tests**:
- [ ] Provider calendar (`tests/e2e/vendor.spec.ts`)
- [ ] Schedule management
- [ ] Request handling
- [ ] Review management

### Customer Features

**Required Tests**:
- [ ] Customer dashboard
- [ ] Booking history
- [ ] Favorites management
- [ ] Profile management
- [ ] Settings

### Payment System

**Required Tests**:
- [ ] Stripe integration (`tests/e2e/stripe-replay.spec.ts`)
- [ ] Payment intent creation
- [ ] Webhook handling (`tests/webhook-roundtrip.spec.ts`)
- [ ] Refund processing (`tests/lib/refundService.spec.ts`)
- [ ] Payment errors (`tests/e2e/payment-errors.spec.ts`)

### Notification System

**Required Tests**:
- [ ] Notification contracts (`tests/contracts/notifications/`)
- [ ] Notification delivery (`tests/lib/notificationRetry.spec.ts`)
- [ ] Retry mechanisms (`tests/lib/notifications.retry.exhaustion.spec.ts`)
- [ ] Push subscriptions

### Knowledge Base

**Required Tests**:
- [ ] KB API (`tests/api.kb.spec.ts`)
- [ ] Search functionality
- [ ] Article rendering
- [ ] Feedback system

### SimCity Control Plane

**Required Tests**:
- [ ] SimCity contracts (`tests/contracts/simcity/`)
- [ ] Control plane integration (`tests/integration/simcity.controlplane.spec.ts`)
- [ ] Domain management (`tests/integration/simcity.domains.spec.ts`)
- [ ] Event handling (`tests/integration/simcity.events.spec.ts`)
- [ ] Replay functionality (`tests/integration/simcity.replay.spec.ts`)

---

## Test Data Management

### Test Fixtures

- Use `tests/fixtures/base.ts` for Playwright fixtures
- Use `tests/utils/supabase-mocks.ts` for Supabase mocks
- Create realistic test data
- Clean up test data after tests

### Test Environment

- Use separate test database
- Use test Stripe keys
- Use test email service
- Isolate test environments

---

## Debugging Tests

### Unit/Integration Tests

```bash
pnpm test --ui              # Vitest UI
pnpm test --reporter=verbose
```

### E2E Tests

```bash
pnpm e2e:debug              # Debug mode
pnpm e2e:ui                 # UI mode
```

### Common Issues

1. **Flaky Tests**: Add retries, improve waits, fix race conditions
2. **Slow Tests**: Optimize queries, reduce test data, parallelize
3. **Failing Tests**: Check test environment, update mocks, verify dependencies

---

## Best Practices

1. **Write Tests First**: TDD when possible
2. **Test Behavior, Not Implementation**: Focus on what, not how
3. **Keep Tests Simple**: One assertion per test when possible
4. **Use Descriptive Names**: Test names should describe behavior
5. **Avoid Test Interdependence**: Tests should be independent
6. **Mock External Services**: Don't rely on external services in tests
7. **Clean Up**: Clean up test data and mocks
8. **Document Complex Tests**: Add comments for complex test scenarios
9. **Review Test Coverage**: Ensure critical paths are covered
10. **Maintain Tests**: Update tests when features change

---

## Appendix

### Test Commands Reference

```bash
# Unit/Integration/API Tests
pnpm test                    # Run all Vitest tests (watch mode)
pnpm test:run                # Run all Vitest tests (once)
pnpm test:integration        # Run integration tests only
pnpm test:coverage           # Run with coverage report

# E2E Tests
pnpm e2e                     # Run all E2E tests (headless)
pnpm e2e:ui                  # Run E2E tests with UI
pnpm e2e:debug               # Run E2E tests in debug mode

# Specialized Tests
pnpm contract                # Run contract tests
pnpm loadtest                # Run load tests
pnpm chaos                   # Run chaos tests

# Other
pnpm lint                    # Run linter
pnpm type-check              # Type checking
```

### Test File Templates

See existing test files for templates:
- `tests/api/blocks.spec.ts` - API test template
- `tests/e2e/booking-flow.spec.ts` - E2E test template
- `tests/components/` - Component test templates
- `tests/unit/` - Unit test templates

---

## Version History

- **2025-01-XX**: Initial comprehensive test plan created
- Updates should be tracked when features are added or modified

---

## Notes

- This test plan should be updated whenever new features are added
- See `.cursorrules` for automatic update directives
- Regular review and updates ensure the test plan stays current
- All team members should be familiar with this test plan
