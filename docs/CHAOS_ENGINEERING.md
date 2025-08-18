# 🌪️ Chaos Engineering Documentation

## Overview

Bookiji implements **production-grade chaos engineering** to ensure the platform remains resilient under network failures, service outages, and stress conditions. This system goes beyond traditional testing by **enforcing specific UX contracts** that guarantee graceful degradation.

## Architecture

### Four-Layer Quality Defense

```
🛡️ Component Level    → Real-time dev warnings (a11y enforcement)
🛡️ Pre-Commit        → Static analysis guards (button accessibility)  
🛡️ A11y Tests        → WCAG compliance under normal conditions
🛡️ Chaos Tests       → UX contract enforcement under failures ⚡
```

### Chaos System Components

1. **Chaos Harness** (`tests/utils/chaos.ts`)
   - Network failure injection
   - Latency simulation
   - Service-specific targeting (Supabase, AI, Payments)
   - Smart asset filtering

2. **UX Contracts** (`tests/chaos/ux-contracts.spec.ts`)
   - Time-bound resilience requirements
   - Specific user experience guarantees
   - Business impact classification

3. **Chaos Taxonomy** (`scripts/chaos-taxonomy.mjs`)
   - Failure pattern classification
   - Trend tracking and analysis
   - Actionable recommendations

## UX Contracts Defined

### 🚨 **Payment Flow Contract**
- **Requirement**: Must show graceful fallback with retry within 8s
- **Severity**: Critical (revenue impact)
- **Current Status**: ❌ VIOLATION - Complete crash under network stress

### ⚠️ **Offline Banner Contract**  
- **Requirement**: Must show network status indicator within 2s of connection loss
- **Severity**: High (user confusion)
- **Current Status**: ❌ VIOLATION - No offline UI implemented

### ⚠️ **Search Retry Contract**
- **Requirement**: Must re-enable or offer retry mechanism within 5s
- **Severity**: Medium (user experience)
- **Current Status**: ✅ PASSING - Proper retry logic working

### ⚠️ **Theme Timeout Contract**
- **Requirement**: Must resolve to safe default within 3s, not stay in loading state
- **Severity**: Low (polish)
- **Current Status**: ❌ VIOLATION - Stuck in "Loading theme" state

### ⚠️ **Route Error Boundary Contract**
- **Requirement**: Critical routes must show error boundaries, not blank screens
- **Severity**: High (user navigation)
- **Current Status**: ❌ VIOLATION - Routes fail to blank screens

## Commands Reference

### Development Commands
```bash
# Test UX contracts with high failure rates
pnpm chaos:contracts

# Light chaos testing (CI-safe, must pass 100%)
pnpm chaos:light

# Storm chaos testing (stress test, allowed failures)
pnpm chaos:storm

# Offline mode testing
pnpm chaos:offline

# A11y + chaos integration
pnpm chaos:a11y

# Full chaos suite + analysis
pnpm chaos:full

# Analyze failure patterns
pnpm chaos:taxonomy
```

### CI Integration
```bash
# In GitHub Actions - see .github/workflows/e2e.yml
- name: Light chaos testing (must pass)
  run: pnpm chaos:light

- name: Storm chaos testing (report-only)  
  run: pnpm chaos:storm || echo "::warning ::Graceful degradation tested"
```

## Configuration

### Chaos Parameters
Set these environment variables to control chaos behavior:

```bash
# Master switch
CHAOS_ENABLED=true

# Base parameters
CHAOS_LATENCY_MS=300          # Extra latency added to requests
CHAOS_FAILURE_RATE=0.20       # 20% random failures
CHAOS_TIMEOUT_RATE=0.10       # 10% request aborts

# Service-specific targeting
CHAOS_SUPABASE_FAIL_RATE=0.25 # 25% Supabase failures
CHAOS_AI_FAIL_RATE=0.15       # 15% AI service failures  
CHAOS_PAYMENT_FAIL_RATE=0.10  # 10% payment failures
```

### Chaos Presets

#### Light Chaos (CI-Safe)
- 150ms latency, 5% failures, 2% timeouts
- 10% Supabase issues
- **Must pass 100%** - blocks deployment if critical paths fail

#### Storm Chaos (Stress Test)
- 400ms latency, 15% failures, 8% timeouts  
- 30% Supabase, 25% AI failures
- **Report-only** - tests graceful degradation patterns

## Implementation Guide

### Adding New UX Contracts

1. **Define the Contract**
   ```typescript
   test('@contract new-feature must handle failure within Xs', async ({ page }) => {
     // Test specific resilience behavior
     // Assert time-bound requirements
     // Verify graceful degradation
   });
   ```

2. **Add to Taxonomy**
   ```javascript
   const FAILURE_PATTERNS = {
     'new-pattern': {
       keywords: ['specific', 'error', 'indicators'],
       severity: 'high',
       category: 'resilience',
       description: 'What this pattern means and why it matters'
     }
   };
   ```

3. **Wire into CI**
   - Add to appropriate chaos test suite
   - Ensure proper severity classification
   - Update documentation

### Fixing Contract Violations

#### Payment Flow Fixes
```typescript
// Add React error boundary
<ErrorBoundary fallback={<PaymentErrorFallback />}>
  <PaymentForm />
</ErrorBoundary>

// Implement graceful fallback
function PaymentErrorFallback({ error, retry }) {
  return (
    <div role="alert">
      <h2>Payment temporarily unavailable</h2>
      <p>Please try again in a moment.</p>
      <button onClick={retry}>Retry Payment</button>
    </div>
  );
}
```

#### Offline Detection Implementation
```typescript
// Network status hook
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
}

// Offline banner component
function OfflineBanner() {
  const isOnline = useNetworkStatus();
  
  if (isOnline) return null;
  
  return (
    <div role="alert" aria-live="assertive" className="offline-banner">
      📡 You're offline. Check your connection and try again.
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
}
```

#### Theme Timeout Implementation
```typescript
// Theme provider with timeout
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('loading');
  
  useEffect(() => {
    // Set 3s timeout to safe default
    const timeout = setTimeout(() => {
      if (theme === 'loading') {
        setTheme('corporate'); // Safe default
      }
    }, 3000);
    
    // Load actual theme
    loadTheme().then(setTheme).catch(() => setTheme('corporate'));
    
    return () => clearTimeout(timeout);
  }, []);
  
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
```

## Metrics and Monitoring

### Resilience Score Calculation
```
Resilience Score = (Passing Contracts / Total Contracts) × 100%

Current: 20% (1/5 contracts passing)
Target: 80%+ for production readiness
```

### Pattern Classification
- **Critical**: Revenue/business impact (payment failures)
- **High**: User experience breaks (offline states, blank screens)  
- **Medium**: Interaction problems (disabled buttons, retry loops)
- **Low**: Polish issues (loading states, cosmetic problems)

### Tracking Progress
- Run `pnpm chaos:taxonomy` after each chaos test suite
- Monitor contract violation trends over time
- Update resilience score as fixes are implemented
- Use failure pattern data to prioritize improvements

## Best Practices

### Writing Chaos Tests
1. **Be Specific**: Test exact time requirements (2s, 3s, 5s)
2. **Be Realistic**: Use production-like failure rates
3. **Be Assertive**: Clear pass/fail criteria, no ambiguity
4. **Be Accessible**: Ensure error states remain WCAG compliant

### Handling Failures
1. **Prioritize by Severity**: Critical > High > Medium > Low
2. **Focus on Contracts**: Fix contract violations before adding features
3. **Test Incrementally**: Verify fixes with chaos tests before merging
4. **Document Patterns**: Update taxonomy as new patterns emerge

### CI Integration
1. **Light Chaos**: Must pass for deployment
2. **Storm Chaos**: Report-only, tracks graceful degradation
3. **Artifact Collection**: Always upload traces and reports
4. **Clear Messaging**: Distinguish expected vs unexpected failures

## Future Enhancements

### Planned Improvements
1. **Visual Chaos Testing**: Screenshot fallback UIs to prevent regressions
2. **Chaos Matrix**: Rotate failure scenarios (auth down, storage slow, DB errors)
3. **Service Worker Integration**: Test offline caching and sync
4. **Real User Monitoring**: Correlate chaos findings with production metrics

### Advanced Patterns
1. **Circuit Breakers**: Auto-fallback when services consistently fail
2. **Graceful Degradation**: Feature flags to disable non-critical functionality
3. **Progressive Enhancement**: Core functionality works even when features fail
4. **Chaos Scheduling**: Regular chaos runs to catch regressions early

## Troubleshooting

### Common Issues

#### Tests Not Running
- Check `playwright.config.ts` includes chaos directory in `testMatch`
- Verify `CHAOS_ENABLED=true` environment variable
- Ensure chaos harness is properly installed in test beforeEach

#### False Positives
- Review failure timeouts - may need adjustment for slower systems
- Check if selectors match your actual UI components
- Verify chaos parameters aren't too aggressive for test environment

#### Missing Failures
- Increase failure rates in test configuration
- Check that chaos harness is targeting the right endpoints
- Verify network conditions are properly simulated

### Debug Commands
```bash
# Run with headed browser to see failures
HEADED=1 pnpm chaos:contracts

# Enable trace collection
pnpm chaos:contracts --trace=retain-on-failure

# View chaos harness logs
pnpm chaos:contracts --reporter=list
```

## Conclusion

The chaos engineering system ensures Bookiji **fails gracefully** rather than catastrophically. By enforcing specific UX contracts, we guarantee users always have a path forward even when services fail.

**Remember**: The goal isn't to prevent all failures - it's to ensure failures **teach users what to do next** rather than leaving them stranded.

---

*This system was built to Netflix/Amazon standards. Use it to build antifragile applications that get stronger under stress.* 🌪️⚡🛡️
