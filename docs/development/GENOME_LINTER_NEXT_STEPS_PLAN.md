# Genome + Linter Integration: Next Steps Plan

**Date:** 2025-01-23  
**Status:** Planning Phase - DO NOT IMPLEMENT YET  
**Goal:** Bring system to full green status and complete architectural foundation

---

## Overview

This plan outlines the steps needed to:
1. Fix 39 failing tests due to Supabase client mocking issues
2. Improve Genome Linter internal resilience and developer experience
3. Enhance developer tooling and documentation

**Critical Constraint:** All changes must be isolated to test infrastructure and linter improvements. NO runtime application code modifications.

---

## Phase 1: Fix Failing Test Suite

### Problem Analysis

**Root Cause:** The test setup mocks `@/lib/supabaseClient` but is missing the `supabaseBrowserClient()` export that components actually use.

**Evidence:**
- Error: `[vitest] No "supabaseBrowserClient" export is defined on the "@/lib/supabaseClient" mock`
- Affected components: `VendorAnalytics`, `VendorDashboard`, `UserDashboard`, `RealAIChat`, `VendorRegistration`, and others
- Current mock in `tests/setup.ts` only exports: `supabase`, `createSupabaseClient`, `getSupabaseClient`
- Actual exports from `src/lib/supabaseClient.ts`: `getBrowserSupabase()`, `supabaseBrowserClient()`, `getServerSupabase()`

### Files to Modify

#### 1. `tests/setup.ts` (Primary Fix)

**Current State:**
- Lines 77-81: Mocks `@/lib/supabaseClient` with incomplete exports
- Missing: `supabaseBrowserClient`, `getBrowserSupabase`, `getServerSupabase`

**Required Changes:**
```typescript
// Add to mockSupabase object (around line 48)
const mockSupabase = {
  // ... existing auth and from mocks ...
}

// Update vi.mock for @/lib/supabaseClient (lines 77-81)
vi.mock('@/lib/supabaseClient', () => ({
  supabase: mockSupabase,  // Keep for backward compatibility
  supabaseBrowserClient: vi.fn(() => mockSupabase),  // NEW - Primary export
  getBrowserSupabase: vi.fn(() => mockSupabase),     // NEW - Internal helper
  getServerSupabase: vi.fn(() => mockSupabase),      // NEW - Server-side
  createSupabaseClient: vi.fn(() => mockSupabase),   // Keep existing
  getSupabaseClient: vi.fn(() => mockSupabase)       // Keep existing
}))
```

**Reasoning:**
- `supabaseBrowserClient()` is the primary function used by components
- Must return the same mock instance for consistency
- Maintains backward compatibility with existing mocks

#### 2. `tests/components/AllComponentsTestRunner.test.tsx` (Secondary Fix)

**Current State:**
- Lines 36-54: Has its own mock that's incomplete
- Missing: `supabaseBrowserClient` export

**Required Changes:**
```typescript
// Update vi.mock('@/lib/supabaseClient') around line 36
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    // ... existing mock structure ...
  },
  supabaseBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({
      // ... same structure as supabase.from ...
    })),
    auth: {
      // ... same structure as supabase.auth ...
    }
  })),
  getBrowserSupabase: vi.fn(() => ({
    // ... same structure ...
  })),
  getServerSupabase: vi.fn(() => ({
    // ... same structure ...
  }))
}))
```

**Reasoning:**
- This test file has its own isolated mock that needs updating
- Must match the structure expected by components

#### 3. `tests/integration/bookingMessages.spec.ts` (Tertiary Fix)

**Current State:**
- Lines 59-60: Mocks `@supabase/ssr` `createServerClient`
- May need additional browser client mocks if components are tested

**Required Changes:**
- Review if this test imports any components that use `supabaseBrowserClient`
- If yes, add mock similar to setup.ts pattern
- If no, leave as-is (server-side only)

**Reasoning:**
- Integration tests may use different client patterns
- Only modify if actually needed

#### 4. Create `tests/utils/supabase-mocks.ts` (New File - Recommended)

**Purpose:** Centralize Supabase mock factory to avoid duplication

**File Structure:**
```typescript
// tests/utils/supabase-mocks.ts
import { vi } from 'vitest'

export function createMockSupabaseClient() {
  return {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signUp: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signIn: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: vi.fn(() => ({ 
        data: { subscription: { unsubscribe: vi.fn() } } 
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          then: vi.fn((callback) => callback({ data: [], error: null }))
        })),
        or: vi.fn(() => ({
          order: vi.fn(() => ({
            then: vi.fn((callback) => callback({ data: [], error: null }))
          }))
        })),
        then: vi.fn((callback) => callback({ data: [], error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
    }))
  }
}

export function createSupabaseClientMocks() {
  const mockClient = createMockSupabaseClient()
  return {
    supabase: mockClient,
    supabaseBrowserClient: vi.fn(() => mockClient),
    getBrowserSupabase: vi.fn(() => mockClient),
    getServerSupabase: vi.fn(() => mockClient),
    createSupabaseClient: vi.fn(() => mockClient),
    getSupabaseClient: vi.fn(() => mockClient),
  }
}
```

**Usage in `tests/setup.ts`:**
```typescript
import { createSupabaseClientMocks } from './utils/supabase-mocks'

const supabaseMocks = createSupabaseClientMocks()

vi.mock('@/lib/supabaseClient', () => supabaseMocks)
```

**Reasoning:**
- DRY principle - single source of truth for mocks
- Easier to maintain and extend
- Consistent mock structure across all tests

### Verification Steps

1. Run test suite: `pnpm test:run`
2. Verify all 39 previously failing tests now pass
3. Check that no new test failures were introduced
4. Verify components can access `supabaseBrowserClient()` without errors

### Expected Outcome

- All 213 passing tests remain passing
- All 39 failing tests now pass
- Total: 252/252 tests passing (100%)
- No runtime code changes

---

## Phase 2: Improve Genome Linter Resilience

### Problem Analysis

**Current Issues:**
1. Linter fails hard when optional directories don't exist
2. No distinction between critical errors and recoverable warnings
3. No self-describing output or explanation mode
4. Limited graceful degradation for missing optional modules

### Files to Modify

#### 1. `src/genome/utils.ts` (Enhancement)

**Current State:**
- Basic file system utilities
- No graceful error handling for missing paths

**Required Changes:**

Add new utility functions:
```typescript
// Add after existing functions (around line 55)

/**
 * Safely check if a path exists, returning false on any error
 */
export function safeExists(targetPath: string): boolean {
  try {
    return fs.existsSync(targetPath)
  } catch {
    return false
  }
}

/**
 * Check if a directory exists and is accessible
 * Returns { exists: boolean, accessible: boolean, error?: string }
 */
export function checkDirectoryAccess(targetPath: string): {
  exists: boolean
  accessible: boolean
  error?: string
} {
  try {
    if (!fs.existsSync(targetPath)) {
      return { exists: false, accessible: false }
    }
    const stat = fs.statSync(targetPath)
    if (!stat.isDirectory()) {
      return { exists: true, accessible: false, error: 'Path is not a directory' }
    }
    // Try to read directory to verify access
    fs.readdirSync(targetPath)
    return { exists: true, accessible: true }
  } catch (error) {
    return {
      exists: false,
      accessible: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Read directory contents safely, returning empty array on error
 */
export function safeReadDir(targetPath: string): string[] {
  try {
    return fs.readdirSync(targetPath)
  } catch {
    return []
  }
}
```

**Reasoning:**
- Provides graceful error handling
- Allows validators to distinguish between missing vs. inaccessible paths
- Prevents linter crashes on permission errors

#### 2. `src/genome/validateCore.ts` (Resilience Improvements)

**Current State:**
- Lines 10-22: Hard errors for missing module paths
- No handling for optional modules

**Required Changes:**

```typescript
// Update validateCore function (lines 5-33)

export async function validateCore(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const modules = genome.domains.core.modules ?? [];

  modules.forEach((module) => {
    const modulePath = resolveRepoPath(context.repoRoot, module.path);
    const pathCheck = checkDirectoryAccess(modulePath);
    
    if (!pathCheck.exists) {
      // Check if module is marked as optional in genome spec
      // For now, treat as error, but add clear message
      errors.push(`Missing core module path: ${module.path} (required for ${module.id})`);
      return;
    }
    
    if (!pathCheck.accessible && pathCheck.error) {
      errors.push(`Cannot access module path ${module.path}: ${pathCheck.error}`);
      return;
    }

    (module.requiredFiles ?? []).forEach((file) => {
      const filePath = path.join(modulePath, file);
      if (!safeExists(filePath)) {
        errors.push(`Module ${module.id} is missing required file ${file}`);
      }
    });
  });

  // Runtime profiles validation with better error messages
  (genome.domains.core.runtimeProfiles ?? []).forEach((profile) => {
    const configPath = resolveRepoPath(context.repoRoot, profile.config);
    if (!safeExists(configPath)) {
      errors.push(`Runtime profile "${profile.name}" config not found at ${profile.config}`);
    }
  });

  return { domain: "core", errors, warnings };
}
```

**Reasoning:**
- Better error messages with context
- Graceful handling of access errors
- Maintains strict validation for required modules

#### 3. `src/genome/index.ts` (Add Explanation Mode)

**Current State:**
- Lines 63-114: Basic linter execution
- No explanation or verbose mode

**Required Changes:**

```typescript
// Update runGenomeLinter function signature (line 63)
export async function runGenomeLinter(options?: {
  repoRoot?: string;
  quiet?: boolean;
  explain?: boolean;  // NEW
}): Promise<GenomeRunResult> {
  // ... existing code ...

  // Add explanation output if requested (after line 107)
  if (options?.explain) {
    console.log("\n==== Genome Linter Explanation ====");
    console.log("The Genome linter validates repository structure against genome/master-genome.yaml");
    console.log("Errors indicate missing required files/directories that block CI");
    console.log("Warnings indicate optional or incomplete configurations");
    console.log("\nFor more information, see:");
    console.log("  - genome/linter-rules.md (validation semantics)");
    console.log("  - docs/genome-overview.md (system overview)");
    console.log("  - docs/how-to-update-genome.md (updating the spec)");
    
    // Show domain-by-domain explanation
    results.forEach((result) => {
      if (result.errors.length > 0 || result.warnings.length > 0) {
        console.log(`\n[${result.domain.toUpperCase()}]`);
        if (result.errors.length > 0) {
          console.log(`  ${result.errors.length} error(s) - must be fixed for CI to pass`);
        }
        if (result.warnings.length > 0) {
          console.log(`  ${result.warnings.length} warning(s) - advisory, does not block CI`);
        }
      }
    });
  }

  // ... rest of function ...
}
```

**Reasoning:**
- Self-describing output helps developers understand failures
- Links to documentation for deeper context
- Helps onboard new contributors

#### 4. `src/genome/validateOpsAI.ts` (Example: Optional Module Handling)

**Current State:**
- May have hard errors for missing smoke tests

**Required Changes:**

Review and update to use warnings for intentionally optional items:
```typescript
// Example pattern for optional items
(genome.domains.opsai.diagnostics?.smokeTests ?? []).forEach((script) => {
  const scriptPath = resolveRepoPath(context.repoRoot, script);
  if (!safeExists(scriptPath)) {
    // Smoke tests may be intentionally offline - use warning
    warnings.push(`Smoke test script not found: ${script} (may be intentionally offline)`);
  }
});
```

**Reasoning:**
- Matches documented behavior in `genome/linter-rules.md`
- Allows gradual adoption of optional features

#### 5. Create `src/genome/cli.ts` (New File - CLI Interface)

**Purpose:** Add command-line interface with explanation mode

**File Structure:**
```typescript
// src/genome/cli.ts
import { runGenomeLinter } from './index'

const args = process.argv.slice(2)
const explain = args.includes('--explain') || args.includes('-e')
const quiet = args.includes('--quiet') || args.includes('-q')

async function main() {
  const result = await runGenomeLinter({ explain, quiet })
  
  if (result.totalErrors > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Genome linter failed:', error)
  process.exit(1)
})
```

**Update `package.json` script:**
```json
{
  "scripts": {
    "genome:validate": "tsx src/genome/cli.ts",
    "genome:explain": "tsx src/genome/cli.ts --explain"
  }
}
```

**Reasoning:**
- Provides user-friendly CLI interface
- Makes explanation mode discoverable
- Follows standard CLI patterns

### Verification Steps

1. Run linter: `pnpm genome:validate`
2. Test with missing optional directory (should warn, not error)
3. Test explanation mode: `pnpm genome:explain`
4. Verify CI still fails on actual errors
5. Check that warnings don't block CI

### Expected Outcome

- Linter handles missing optional directories gracefully
- Clear distinction between errors and warnings
- Self-describing output available via `--explain` flag
- Better error messages with context
- No breaking changes to existing behavior

---

## Phase 3: Developer Experience Improvements

### Problem Analysis

**Current Gaps:**
1. No developer guide for test mocking patterns
2. Limited documentation on Genome linter usage
3. No troubleshooting guide for common test failures
4. Missing examples of proper mock setup

### Files to Create

#### 1. `docs/development/TESTING_GUIDE.md` (New File)

**Purpose:** Comprehensive guide for writing and maintaining tests

**Sections:**
- **Supabase Mocking Patterns**
  - When to use `supabaseBrowserClient` vs `getServerSupabase`
  - How to mock different Supabase operations
  - Common pitfalls and solutions
  
- **Component Testing Best Practices**
  - Using test utilities from `tests/utils/`
  - Mocking hooks and context providers
  - Testing async operations
  
- **Integration Test Patterns**
  - API route testing
  - Database interaction mocking
  - Authentication flow testing
  
- **Troubleshooting Common Issues**
  - "No export defined" errors
  - Async timing issues
  - Mock cleanup problems

**File Location:** `docs/development/TESTING_GUIDE.md`

**Reasoning:**
- Helps developers write tests correctly from the start
- Reduces support burden
- Documents established patterns

#### 2. `docs/development/GENOME_LINTER_GUIDE.md` (New File)

**Purpose:** Developer guide for Genome linter usage and troubleshooting

**Sections:**
- **Quick Start**
  - Running the linter
  - Understanding output
  - Common commands
  
- **Understanding Errors vs Warnings**
  - What blocks CI
  - What's advisory
  - How to fix common errors
  
- **Updating the Genome Spec**
  - When to add new modules
  - How to mark items as optional
  - Best practices for spec maintenance
  
- **Troubleshooting**
  - "Missing module path" errors
  - Permission issues
  - Spec validation failures

**File Location:** `docs/development/GENOME_LINTER_GUIDE.md`

**Reasoning:**
- Makes Genome system accessible to all developers
- Reduces confusion about linter behavior
- Documents the "why" behind validation rules

#### 3. `tests/README.md` (New File)

**Purpose:** Test suite overview and quick reference

**Sections:**
- **Test Structure**
  - Unit tests location
  - Integration tests location
  - Component tests location
  
- **Running Tests**
  - `pnpm test` - watch mode
  - `pnpm test:run` - single run
  - `pnpm test:coverage` - with coverage
  
- **Test Utilities**
  - Available mock helpers
  - Common setup patterns
  - Shared test fixtures
  
- **Writing New Tests**
  - Test file naming conventions
  - Required imports
  - Mock setup checklist

**File Location:** `tests/README.md`

**Reasoning:**
- Onboarding for new contributors
- Quick reference for common tasks
- Documents test organization

#### 4. Update `README.md` (Enhancement)

**Current State:**
- Has testing section but could be more detailed

**Required Changes:**

Add to testing section (around line 159):
```markdown
## 🧪 Testing

### Quick Commands
- `pnpm test` - Run tests in watch mode
- `pnpm test:run` - Run all tests once
- `pnpm test:coverage` - Generate coverage report
- `pnpm e2e` - Run Playwright E2E tests

### Test Organization
- Unit tests: `tests/unit/**/*.test.{ts,tsx}`
- Integration tests: `tests/integration/**/*.spec.ts`
- Component tests: `tests/components/**/*.test.tsx`
- API tests: `tests/api/**/*.spec.ts`

### Documentation
- [Testing Guide](docs/development/TESTING_GUIDE.md) - Comprehensive testing patterns
- [Test Suite README](tests/README.md) - Test organization and utilities
```

**Reasoning:**
- Makes testing documentation discoverable
- Provides quick reference
- Links to detailed guides

### Verification Steps

1. Review documentation for accuracy
2. Test that examples in guides work
3. Verify links are correct
4. Check that new developers can follow guides

### Expected Outcome

- Clear documentation for test patterns
- Accessible Genome linter guide
- Better onboarding experience
- Reduced support questions

---

## Implementation Order

### Recommended Sequence

1. **Phase 1.1:** Fix `tests/setup.ts` mock (highest impact, fixes most failures)
2. **Phase 1.2:** Create `tests/utils/supabase-mocks.ts` (enables consistency)
3. **Phase 1.3:** Update individual test files with isolated mocks
4. **Phase 1.4:** Verify all tests pass
5. **Phase 2.1:** Add utility functions to `src/genome/utils.ts`
6. **Phase 2.2:** Update validators with resilience improvements
7. **Phase 2.3:** Add explanation mode to `src/genome/index.ts`
8. **Phase 2.4:** Create CLI interface
9. **Phase 3.1:** Write testing guide
10. **Phase 3.2:** Write Genome linter guide
11. **Phase 3.3:** Create tests README
12. **Phase 3.4:** Update main README

### Dependencies

- Phase 1 must complete before Phase 3 (testing guide needs working examples)
- Phase 2 can proceed in parallel with Phase 1
- Phase 3 depends on Phases 1 and 2 being complete

---

## Success Criteria

### Phase 1 Success
- ✅ All 252 tests passing (currently 213/252)
- ✅ No new test failures introduced
- ✅ Components can use `supabaseBrowserClient()` in tests
- ✅ Mock structure is consistent across test files

### Phase 2 Success
- ✅ Linter handles missing optional directories gracefully
- ✅ Clear error/warning boundaries
- ✅ `--explain` flag provides helpful output
- ✅ No breaking changes to CI behavior
- ✅ Better error messages with context

### Phase 3 Success
- ✅ Comprehensive testing guide published
- ✅ Genome linter guide published
- ✅ Test suite README created
- ✅ Main README updated with links
- ✅ Documentation is accurate and tested

### Overall Success
- ✅ 100% test pass rate
- ✅ Linter is resilient and self-describing
- ✅ Developer documentation is complete
- ✅ No runtime code changes
- ✅ System is production-ready

---

## Risk Mitigation

### Potential Risks

1. **Mock changes break existing tests**
   - Mitigation: Update mocks incrementally, test after each change
   - Rollback: Git revert if issues arise

2. **Linter changes affect CI behavior**
   - Mitigation: Test in CI before merging
   - Rollback: Revert validator changes if CI breaks

3. **Documentation becomes outdated**
   - Mitigation: Link documentation to code, review in PRs
   - Maintenance: Update docs when patterns change

### Testing Strategy

- Run full test suite after each phase
- Test linter with various repository states
- Verify documentation examples work
- Check CI pipeline after changes

---

## Notes

- All changes are isolated to test infrastructure and linter code
- No production runtime code will be modified
- Changes maintain backward compatibility where possible
- Documentation will be kept in sync with code

---

**Next Action:** Review this plan, then proceed with Phase 1.1 implementation.

