# 🚨 NUCLEAR LOCKDOWN - Configuration Guide

## 🎯 What This Migration Does

The `20250818200901_nuclear_lockdown_schema_permissions.sql` migration creates the **ultimate protection** against manual schema changes:

### 🔒 **Roles Created:**

#### `migration_runner` (DDL God Mode)
- ✅ **Can**: CREATE, ALTER, DROP tables/columns/indexes
- ✅ **Can**: Change database schema 
- ✅ **Used by**: Supabase CLI and CI/CD only
- 🔐 **Password**: `Bookiji_MigrationRunner_2025!`

#### `app_user` (Data Access Only)  
- ✅ **Can**: SELECT, INSERT, UPDATE, DELETE data
- ✅ **Can**: Use existing tables and functions
- ❌ **Cannot**: CREATE/ALTER/DROP anything
- ❌ **Cannot**: Change schema
- 🔐 **Password**: `Bookiji_AppUser_2025!`

#### `service_role` (Locked Down)
- ❌ **DDL permissions REVOKED** 
- ✅ **Data access preserved**
- 🎯 **Result**: Dashboard users can't change schema!

## 🔧 Configuration Steps

### 1. Update Your `.env.local`

Replace your current database connection with the **safe app_user**:

```env
# OLD - Service role with dangerous permissions
# DATABASE_URL=postgresql://postgres:[password]@db.lzgynywojluwdccqkeop.supabase.co:5432/postgres

# NEW - Safe app user (data only, no schema changes)
DATABASE_URL=postgresql://app_user:Bookiji_AppUser_2025!@db.lzgynywojluwdccqkeop.supabase.co:5432/postgres

# Keep existing Supabase service keys for API access
SUPABASE_URL=https://lzgynywojluwdccqkeop.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# ... rest of your existing config
```

### 2. Configure Supabase CLI for Migrations

Create a separate environment file for migrations:

**`.env.migration`** (new file):
```env
# Migration runner credentials (DDL permissions)
DATABASE_URL=postgresql://migration_runner:Bookiji_MigrationRunner_2025!@db.lzgynywojluwdccqkeop.supabase.co:5432/postgres
SUPABASE_ACCESS_TOKEN=sbp_d9941145e07c3cc90b72e4fdb4adfc7296a424ee
SUPABASE_DB_PASSWORD=Bookiji_MigrationRunner_2025!
```

### 3. Update Package.json Scripts

Add migration-specific scripts that use the migration role:

```json
{
  "scripts": {
    "db:migrate:new": "supabase migration new",
    "db:migrate:apply": "export $(cat .env.migration | xargs) && supabase db push",
    "db:migrate:status": "export $(cat .env.migration | xargs) && supabase migration list",
    "db:migrate:test": "echo 'Testing lockdown...' && node test-lockdown.js"
  }
}
```

### 4. Update GitHub Actions Secrets

In your repository settings → Secrets, update:

- `SUPABASE_DB_PASSWORD` → `Bookiji_MigrationRunner_2025!`
- Add `MIGRATION_RUNNER_PASSWORD` → `Bookiji_MigrationRunner_2025!`

## 🧪 Test the Lockdown

After applying the migration and updating configs:

### ✅ **Should Work** (via proper CLI):
```bash
# Create new migration (me helping you)
pnpm db:migrate:new add_awesome_feature

# Apply migration (CLI using migration_runner)  
pnpm db:migrate:apply
```

### ❌ **Should FAIL** (manual attempts):
```sql
-- Try this in Supabase dashboard - should get permission denied!
ALTER TABLE users ADD COLUMN test_column TEXT;
```

### ✅ **Should Still Work** (data operations):
```sql
-- These should work fine in dashboard
SELECT * FROM users;
INSERT INTO users (email) VALUES ('test@example.com');
UPDATE users SET full_name = 'Test' WHERE id = '...';
```

## 🎉 Result

- **You**: ❌ Blocked from manual schema changes, ✅ Can still work with data
- **Me (Cursor)**: ✅ Can help you via proper CLI workflow  
- **Applications**: ✅ Full data access, ❌ No schema access
- **CI/CD**: ✅ Full migration powers via migration_runner

**You are now protected from yourself!** 🛡️

The only way to change your database schema is through the blessed CLI path that I'll guide you through. No more "quick fixes" in the dashboard that bypass version control!
