# Console.log Migration Guide

**Status:** In Progress  
**Target:** Zero `console.log` in `src/` directory  
**Timeline:** 2-3 days

## Overview

All `console.log`, `console.error`, `console.warn`, `console.info`, and `console.debug` calls in production code paths must be replaced with the centralized logger (`src/lib/logger.ts`).

## Why Migrate?

1. **Information Leakage:** Console logs may expose sensitive data in production
2. **Performance:** Console operations have overhead
3. **Noise:** Development logs clutter production logs
4. **Consistency:** Centralized logging enables better monitoring integration

## Migration Steps

### 1. Import Logger

```typescript
import { logger } from '@/lib/logger'
```

### 2. Replace Console Calls

#### Before:
```typescript
console.log('User logged in:', userId)
console.error('Failed to fetch data:', error)
console.warn('Deprecated API used')
```

#### After:
```typescript
logger.info('User logged in', { userId })
logger.error('Failed to fetch data', error, { userId })
logger.warn('Deprecated API used')
```

### 3. Migration Patterns

#### Simple Logs
```typescript
// Before
console.log('Processing request')

// After
logger.info('Processing request')
```

#### Logs with Context
```typescript
// Before
console.log('Booking created:', bookingId, 'for user:', userId)

// After
logger.info('Booking created', { bookingId, userId })
```

#### Errors
```typescript
// Before
console.error('Database error:', error)

// After
logger.error('Database error', error, { /* context */ })
```

#### Warnings
```typescript
// Before
console.warn('Rate limit approaching')

// After
logger.warn('Rate limit approaching')
```

#### Debug (Development Only)
```typescript
// Before
console.debug('Cache hit:', key)

// After
logger.debug('Cache hit', { key })
```

## Logger API

### Methods

- `logger.debug(message, context?)` - Development-only logs
- `logger.info(message, context?)` - Informational logs
- `logger.warn(message, context?)` - Warning logs
- `logger.error(message, error?, context?)` - Error logs (always logged)

### Behavior by Environment

- **Development:** All logs shown
- **Production:** Only warnings and errors shown
- **Staging:** All logs shown (default behavior)

### Context Object

Pass structured data as context:

```typescript
logger.info('Payment processed', {
  bookingId: '123',
  amount: 100,
  currency: 'USD',
  provider: 'stripe'
})
```

## Files to Migrate

### Priority 1: API Routes
- `src/app/api/**/*.ts` - All API route handlers

### Priority 2: Core Libraries
- `src/lib/jarvis/**/*.ts` - Jarvis incident commander
- `src/lib/services/**/*.ts` - Service layer
- `src/lib/booking*.ts` - Booking logic

### Priority 3: Other Libraries
- `src/lib/**/*.ts` - Remaining library files

### Priority 4: Components
- `src/components/**/*.tsx` - React components (lower priority, client-side)

## Verification

### Check for Remaining Console Calls

```bash
# Find all console.log in src/
grep -r "console\.\(log\|error\|warn\|info\|debug\)" src/

# Should return zero results when complete
```

### Test Logger

```typescript
import { logger } from '@/lib/logger'

// In development: should log
logger.info('Test message', { test: true })

// In production: should not log (info suppressed)
logger.info('Test message', { test: true })

// In production: should log (error always logged)
logger.error('Test error', new Error('test'), { test: true })
```

## Exceptions

### Allowed Console Usage

1. **Build Scripts:** `scripts/**/*.mjs` - Build and tooling scripts
2. **Test Files:** `**/*.test.ts` - Test files
3. **CLI Tools:** Command-line utilities

### Temporary Suppression

If you need to temporarily suppress console output (e.g., for AdSense approval), use the logger's environment-aware behavior rather than overriding console.

## Integration with Monitoring

Future enhancements will integrate logger with:
- Sentry (error tracking)
- Log aggregation services
- Performance monitoring

The logger is designed to support these integrations without code changes.

## Progress Tracking

- [ ] API routes migrated
- [ ] Jarvis system migrated
- [ ] Service layer migrated
- [ ] Booking logic migrated
- [ ] Remaining libraries migrated
- [ ] Components migrated (optional)
- [ ] Verification complete

## Related Files

- `src/lib/logger.ts` - Centralized logger implementation
- `docs/development/CONSOLE_LOG_MIGRATION.md` - This file

