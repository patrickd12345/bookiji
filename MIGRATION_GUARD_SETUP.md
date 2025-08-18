# 🛡️ Migration Guard Setup

## 1. Install Husky (if not already installed)

```bash
pnpm add -D husky
pnpm husky install
```

## 2. Set GitHub Secrets

In your repository settings → Secrets and variables → Actions, add:

### Required Secrets:
- `SUPABASE_ACCESS_TOKEN`: Your personal access token from https://supabase.com/dashboard/account/tokens
- `SUPABASE_DB_PASSWORD`: Database password (currently: `Taratata!12321`)

## 3. Add Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "db:migration:new": "supabase migration new",
    "db:migration:list": "supabase migration list", 
    "db:migration:apply": "supabase db push",
    "db:migration:status": "supabase migration list",
    "db:migration:repair": "supabase migration repair",
    "migration:guard": "echo '🛡️ Use: pnpm db:migration:new <name>'"
  }
}
```

## 4. Update README Badge

Add this badge to your README.md:

```markdown
[![Migration Status](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/your-org/bookijibck/main/.github/badges/migrations.json)](https://github.com/your-org/bookijibck/actions/workflows/migration-drift-detection.yml)
```

## 5. Make Pre-commit Hook Executable

```bash
chmod +x .husky/pre-commit
```

## 6. Test the Setup

```bash
# Test pre-commit hook
git add .
git commit -m "test migration guard"

# Test CI workflow by pushing changes
git push
```

## 🎯 Expected Behavior

### ✅ Allowed:
- `supabase migration new add_user_table` → creates `20250118123045_add_user_table.sql`
- Emergency hotfixes with proper documentation
- Legacy migrations already in correct format

### ❌ Blocked:
- Manual files like `add_user_table.sql`
- Malformed timestamps like `20250118_add_user.sql`
- Dangerous operations without safety comments
- Emergency hotfixes without documentation

### 🏷️ Badge States:
- 🟢 **"47 synced"** - All migrations synchronized
- 🔴 **"drift detected"** - Local/remote mismatch
- 🟡 **"checking..."** - CI running

## 🚨 If Badge Goes Red:

1. Check the failed CI run for details
2. Run `supabase migration list` locally
3. Apply missing migrations: `supabase db push`
4. If needed, repair tracking: `supabase migration repair`
5. Verify: All entries should show `Local = Remote`

The badge will automatically turn green on next push once drift is resolved.
