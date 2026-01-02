# Pre-Commit Hook Analysis & Optimization

## Current Pre-Commit Hooks (ABUSIVE - TOO SLOW)

The current `.husky/pre-commit` hook runs:

1. **`pnpm type-check`** - TypeScript type checking on **ENTIRE codebase**
   - ⏱️ **Estimated time: 10-30+ seconds**
   - ❌ **Problem**: Checks all files, not just staged changes
   - ✅ **Blocking**: Yes (fails commit if errors found)

2. **`pnpm eslint . --quiet`** - ESLint on **ENTIRE codebase**
   - ⏱️ **Estimated time: 10-20+ seconds**
   - ❌ **Problem**: Checks all files, not just staged changes
   - ❌ **Problem**: Redundant - lint-staged already does this
   - ⚠️ **Non-blocking**: Warnings don't fail commit

3. **`pnpm lint-staged`** - ESLint on **staged files only**
   - ⏱️ **Estimated time: 2-5 seconds** (much faster!)
   - ✅ **Good**: Only checks what you're committing
   - ✅ **Blocking**: Yes (fails commit if errors found)

### Total Estimated Time: **22-55+ seconds per commit** ❌

## Problems Identified

1. **Type-check runs on entire codebase** - Should only check staged files or be moved to CI
2. **ESLint runs twice** - Once on entire codebase (non-blocking), once on staged files (blocking)
3. **Redundant checks** - CI already runs full type-check and lint, so pre-commit should be fast

## Recommended Optimization

### Option 1: Fast Pre-Commit (Recommended)
- ✅ Only run lint-staged (ESLint on staged files) - **2-5 seconds**
- ✅ Let CI handle full type-check and lint
- ⚡ **Total time: 2-5 seconds**

### Option 2: Type-Check Staged Files Only
- ✅ Use `tsc-files` or similar to type-check only staged files
- ✅ Run lint-staged
- ⚡ **Total time: 5-10 seconds**

### Option 3: Keep Current but Make Type-Check Faster
- ✅ Use `tsc --noEmit --incremental` for faster type-checking
- ✅ Remove redundant `eslint .` call
- ✅ Keep lint-staged
- ⚡ **Total time: 10-15 seconds** (still slower than Option 1)

## Recommendation

**Use Option 1** - Pre-commit should be fast and only check what you're committing. Full type-checking belongs in CI where it can run in parallel and doesn't block developer workflow.

## Implementation

✅ **Optimized hook implemented** - Now only runs `lint-staged` (2-5 seconds)

### What Changed
- ❌ Removed: `pnpm type-check` (entire codebase - 10-30s)
- ❌ Removed: `pnpm eslint .` (entire codebase - 10-20s, redundant)
- ✅ Kept: `pnpm lint-staged` (staged files only - 2-5s)

### Why This Works
- CI already runs full `type-check` and `lint` on every PR
- Pre-commit should be fast to not block developer workflow
- lint-staged catches formatting/linting issues in staged files
- Developers can still run `pnpm type-check` manually before pushing

### If You Need Type-Check in Pre-Commit

If you want type-checking in pre-commit, install `tsc-files` and use:

```bash
# Install
pnpm add -D tsc-files

# Then modify .husky/pre-commit to:
#!/usr/bin/env sh
echo "🔍 Type-checking staged files..."
npx tsc-files --noEmit $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' | tr '\n' ' ') || {
  echo "❌ TypeScript errors found. Please fix errors before committing."
  exit 1
}

echo "🔍 Running lint-staged..."
pnpm lint-staged || {
  echo "❌ Lint-staged failed. Please fix errors before committing."
  exit 1
}
```

This would add ~3-5 seconds but only checks staged TypeScript files.
