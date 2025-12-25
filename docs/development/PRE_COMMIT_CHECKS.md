# Pre-Commit Checks

## Current Setup

The pre-commit hook (`.husky/pre-commit`) runs:

1. **TypeScript Type Check** (`pnpm type-check`)
   - Catches missing imports, type errors, undefined functions
   - **BLOCKING** - Commit fails if type errors found

2. **ESLint** (`pnpm eslint . --quiet`)
   - Catches code quality issues
   - **NON-BLOCKING** - Warnings don't block commit (due to memory issues)

3. **lint-staged** - Formats staged files

## Why Errors Are Caught at Deploy Time

Previously, errors were only caught at deploy time because:

1. **Pre-commit hook only ran ESLint** - Not TypeScript checking
2. **ESLint was failing due to memory issues** - So we bypassed with `--no-verify`
3. **No local build checks** - Developers weren't running `pnpm build` before pushing
4. **TypeScript errors only caught during Next.js build** - Which only runs on Vercel

## Solution

Now the pre-commit hook:
- ✅ Runs TypeScript type checking first (catches import errors)
- ✅ Runs ESLint (non-blocking if memory issues)
- ✅ Runs lint-staged for formatting

## Manual Checks Before Committing

If you want to catch errors locally before committing:

```bash
# Type check only (fast)
pnpm type-check

# Full build (slower, but catches everything)
pnpm build
```

## Bypassing Pre-Commit (Not Recommended)

If you must bypass (e.g., for WIP commits):

```bash
git commit --no-verify -m "WIP: ..."
```

**Warning**: This bypasses all checks. Only use for temporary commits that will be fixed before merging.

