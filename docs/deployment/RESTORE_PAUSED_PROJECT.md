# Restoring Bookiji from Paused Project

## Situation
The original Bookiji project (`lzgynywojluwdccqkeop`) was paused for over 90 days and cannot be restored through the dashboard. However, all data remains intact and can be downloaded as a backup.

## Recovery Process

### Step 1: Download Backups from Dashboard

1. Go to the paused project dashboard:
   - https://supabase.com/dashboard/project/lzgynywojluwdccqkeop

2. Download the following backups:
   - **Database backup**: Click "Download backups" → Select database backup
   - **Storage objects**: Download storage backup if you have files in Supabase Storage

3. Save the backup file(s) to your local machine (e.g., `backup-bookiji-2024-06-23.sql`)

### Step 2: New Project Created

✅ **New Project Details:**
- **Project Reference**: `uradoazoyhhozbemrccj`
- **Project Name**: Bookiji-Restored
- **Organization**: `nydhlxaqetemxrvtmokm`
- **Region**: us-east-1
- **Dashboard**: https://supabase.com/dashboard/project/uradoazoyhhozbemrccj

### Step 3: Restore Database Backup

#### Option A: Using PowerShell Script (Windows)

```powershell
# Set access token
$env:SUPABASE_ACCESS_TOKEN = "sbp_4c001c2987d774293b514d4cd5885c8bee308b58"

# Run restore script
.\scripts\restore-from-backup.ps1 `
  -BackupFile "path/to/backup-bookiji-2024-06-23.sql" `
  -NewProjectRef "uradoazoyhhozbemrccj" `
  -DatabasePassword "Bookiji2024!"
```

#### Option B: Using psql Directly

1. Get the database connection string from the new project:
   ```bash
   # From Supabase dashboard: Settings → Database → Connection string
   # Or use the API to get connection details
   ```

2. Restore the backup:
   ```bash
   psql "postgresql://postgres:[PASSWORD]@db.uradoazoyhhozbemrccj.supabase.co:5432/postgres" -f backup-bookiji-2024-06-23.sql
   ```

#### Option C: Using Supabase CLI

```bash
# Link to new project (if not already linked)
supabase link --project-ref uradoazoyhhozbemrccj

# Restore backup
psql $(supabase status --output env | grep DB_URL | cut -d'=' -f2) -f backup-bookiji-2024-06-23.sql
```

### Step 4: Restore Storage Objects (if applicable)

If you downloaded storage backups:

1. Extract the storage backup archive
2. Use Supabase Storage API or dashboard to upload files
3. Or use the Supabase CLI storage commands

### Step 5: Update Environment Variables

Update your `.env.local` and deployment environment variables:

```env
# Old project (paused)
# SUPABASE_URL=https://lzgynywojluwdccqkeop.supabase.co
# NEXT_PUBLIC_SUPABASE_URL=https://lzgynywojluwdccqkeop.supabase.co

# New project (restored)
SUPABASE_URL=https://uradoazoyhhozbemrccj.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://uradoazoyhhozbemrccj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[Get from new project dashboard]
SUPABASE_SERVICE_ROLE_KEY=[Get from new project dashboard]
```

### Step 6: Get New Project API Keys

1. Go to: https://supabase.com/dashboard/project/uradoazoyhhozbemrccj/settings/api
2. Copy:
   - **Project URL**: `https://uradoazoyhhozbemrccj.supabase.co`
   - **anon/public key**: Use as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **service_role key**: Use as `SUPABASE_SERVICE_ROLE_KEY`

### Step 7: Verify Restoration

1. **Check database tables:**
   ```sql
   SELECT COUNT(*) FROM profiles;
   SELECT COUNT(*) FROM bookings;
   SELECT COUNT(*) FROM services;
   ```

2. **Test API connection:**
   ```bash
   curl https://uradoazoyhhozbemrccj.supabase.co/rest/v1/ \
     -H "apikey: YOUR_ANON_KEY"
   ```

3. **Run migrations** (if needed):
   ```bash
   supabase db push
   ```

### Step 8: Update Application

1. Update all environment variables in:
   - `.env.local` (local development)
   - Vercel/Railway environment variables (production)
   - GitHub Secrets (CI/CD)

2. Redeploy the application

## Important Notes

- ⚠️ **Data Loss Prevention**: The original project data is safe in the backup. Always verify the restore before deleting the backup file.

- 🔒 **Security**: Update all API keys and secrets. The old project keys should be rotated/disabled.

- 📊 **Migration**: If you have any custom configurations, RLS policies, or functions, they should be in your migration files and will be applied with `supabase db push`.

- 🧪 **Testing**: Test thoroughly in the new project before switching production traffic.

## Troubleshooting

### Backup file too large
- Use `pg_restore` instead of `psql` for large backups
- Or restore in chunks if the backup is split

### Connection errors
- Verify the database password is correct
- Check that the new project is fully provisioned (may take a few minutes)
- Ensure your IP is whitelisted if using connection pooling

### Missing data
- Verify the backup file is complete
- Check backup file size matches expected database size
- Review backup logs for any errors during download

## Next Steps After Restoration

1. ✅ Verify all critical data is present
2. ✅ Test authentication flows
3. ✅ Test booking functionality
4. ✅ Update DNS/domain settings if using custom domain
5. ✅ Monitor error logs for any issues
6. ✅ Set up automated backups for the new project





















