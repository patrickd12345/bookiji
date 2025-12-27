# Pull Request: [Feature Name]

## Description
Brief description of the changes and why they're needed.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Definition-of-Done Checklist

### Scheduling Safety Check ⚠️
**Required if you touched bookings / payments / slots / time logic**

- [ ] I touched bookings / payments / slots / time
- [ ] SimCity Phase 1 rerun: ✅ PASS (Atomic Slot Invariant)
- [ ] SimCity Phase 2 rerun: ✅ PASS (Payment ↔ Booking Consistency)
- [ ] Evidence attached (screenshot or log output)

**See:** [`docs/operations/SCHEDULING_CHANGE_RULE.md`](../../docs/operations/SCHEDULING_CHANGE_RULE.md)

**Command to run:**
```bash
DEPLOY_ENV=test SIMCITY_ALLOWED_ENVS=test,staging,recovery pnpm exec tsx scripts/adversarial-certification.ts
```

### Core Booking Flow (if applicable)
- [ ] **SLO 24h window green** (P95 ≤ 500ms, P99 ≤ 1s)
- [ ] **DLQ depth 0**, idempotent-skip counter > 0 in chaos run
- [ ] **Rollback drill evidence ≤ 60s** committed to `/ops/drills/...`
- [ ] **Audit + access logs verified**
- [ ] **Performance targets met** (quote API P95 ≤ 500ms, P99 ≤ 1s)

### Testing
- [ ] Unit tests pass (`pnpm test:run`)
- [ ] Component tests pass (`pnpm test:ui`)
- [ ] E2E tests pass (`pnpm e2e`)
- [ ] New tests added for new functionality
- [ ] Test coverage maintained or improved

### Code Quality
- [ ] Linting passes (`pnpm lint`)
- [ ] TypeScript compilation passes (`pnpm type-check`)
- [ ] No console.log statements in production code
- [ ] Proper error handling implemented
- [ ] Accessibility considerations addressed

### Security & Performance
- [ ] Input validation implemented
- [ ] SQL injection prevention measures
- [ ] Rate limiting configured appropriately
- [ ] Performance impact assessed
- [ ] Security review completed

### Documentation
- [ ] API documentation updated
- [ ] README updated if needed
- [ ] Code comments added for complex logic
- [ ] Migration notes documented

### Deployment
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Feature flags configured

## Testing Instructions
Describe how to test the changes, including any specific test data or scenarios.

## Screenshots (if applicable)
Add screenshots for UI changes.

## Related Issues
Closes #[issue number]

## Additional Notes
Any additional information that reviewers should know.
