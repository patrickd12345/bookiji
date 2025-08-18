# 🧪 Test Migration Guard

This demonstrates how the Full Metal Jacket Migration Protocol works in practice.

## Test 1: Block Malformed Migration ❌

```bash
# Try to manually create a bad migration
echo "CREATE TABLE test ();" > supabase/migrations/bad_migration.sql
git add supabase/migrations/bad_migration.sql
git commit -m "test bad migration"

# Result: ❌ BLOCKED by pre-commit hook
# ❌ MIGRATION GUARD VIOLATION!
# 📁 File: supabase/migrations/bad_migration.sql
# 🚫 Invalid filename format: bad_migration.sql
```

## Test 2: Allow Proper CLI Migration ✅

```bash
# Use the proper CLI command
supabase migration new add_test_table

# This creates: supabase/migrations/20250118123045_add_test_table.sql
# Edit the file with your SQL
git add supabase/migrations/20250118123045_add_test_table.sql
git commit -m "add test table via CLI"

# Result: ✅ ALLOWED - proper format
```

## Test 3: Block Dangerous Operation ⚠️

```bash
# Create migration with dangerous operation
supabase migration new dangerous_drop
echo "DROP TABLE users;" > supabase/migrations/20250118123046_dangerous_drop.sql
git add supabase/migrations/20250118123046_dangerous_drop.sql
git commit -m "dangerous operation"

# Result: ❌ BLOCKED by pre-commit hook
# ⚠️  DANGEROUS OPERATION DETECTED!
# 🚨 Contains: DROP TABLE
```

## Test 4: Allow Safe Dangerous Operation ✅

```bash
# Add safety comment
cat <<EOF > supabase/migrations/20250118123046_dangerous_drop.sql
-- CONFIRMED SAFE: Dropping test table that was only used for development
DROP TABLE test_users;
EOF

git add supabase/migrations/20250118123046_dangerous_drop.sql
git commit -m "safe drop operation"

# Result: ✅ ALLOWED - has safety comment
```

## Test 5: CI Drift Detection 🤖

When you push to GitHub:

1. **✅ All synced**: Badge shows "🟢 47 synced"
2. **❌ Drift detected**: Badge shows "🔴 drift detected" + CI fails
3. **🔄 Auto-fix**: Apply missing migrations, badge auto-updates

## Expected Badge Behavior

### In README.md:
```markdown
[![Migration Status](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/your-org/bookijibck/main/.github/badges/migrations.json)](https://github.com/your-org/bookijibck/actions/workflows/migration-drift-detection.yml)
```

### Badge States:
- 🟢 **migrations: 47 synced** - Perfect state
- 🔴 **migrations: drift detected** - Fix immediately
- 🟡 **migrations: checking...** - CI running

## Emergency Override Test

```bash
# Create emergency hotfix
cat <<EOF > supabase/migrations/emergency_fix.sql
-- EMERGENCY HOTFIX
-- Issue: Critical security vulnerability in auth system
-- Risk: User data exposure if not fixed immediately
-- Approved by: @dev-lead @security-team

ALTER TABLE users ADD COLUMN security_patch BOOLEAN DEFAULT true;
EOF

# Document in HOTFIX_MIGRATIONS.md
echo "## [2025-01-18] Migration: emergency_fix.sql" >> HOTFIX_MIGRATIONS.md
echo "**Issue**: Critical auth vulnerability" >> HOTFIX_MIGRATIONS.md
echo "**Approved By**: dev-lead, security-team" >> HOTFIX_MIGRATIONS.md

git add .
git commit -m "emergency security patch"

# Result: ⚠️ ALLOWED with warning - documented emergency
```

## 🎯 Summary

The Full Metal Jacket protocol ensures:
- **NO manual migrations** can be committed
- **NO dangerous operations** without explicit safety approval  
- **NO drift** can exist between local and remote
- **IMMEDIATE visibility** of migration status via badge
- **EMERGENCY procedures** for critical fixes

Your database schema integrity is now bulletproof! 🛡️
