# Step-by-Step Guide: Restore Bookiji Project

Follow these steps in order to restore your Bookiji project from the paused Supabase project.

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:
- [x] ✅ New Supabase project created: `uradoazoyhhozbemrccj`
- [x] ✅ Project linked to local repository
- [x] ✅ API keys retrieved
- [ ] ⏳ Backup file downloaded (we'll do this in Step 1)

---

## Step 1: Download Backup from Old Project

### 1.1 Open the Paused Project Dashboard
1. Go to: **https://supabase.com/dashboard/project/lzgynywojluwdccqkeop**
2. You should see a message about the project being paused

### 1.2 Download the Backup
1. Look for the **"Download backups"** button or section
2. Click on **"Download backups"**
3. You'll see options to download:
   - **Database backup** (SQL file) ← **This is what we need**
   - Storage objects (if you have files)
4. Click **"Download"** for the database backup
5. Save the file to your computer (e.g., `backup-bookiji-2024-06-23.sql`)
   - **Remember the file path!** You'll need it in the next step

### 1.3 Verify Backup File
- Check that the file downloaded successfully
- Note the file size (should be several MB if you have data)
- File extension should be `.sql`

**✅ Step 1 Complete when:** You have the backup SQL file saved on your computer

---

## Step 2: Restore Backup to New Project

### 2.1 Open PowerShell/Terminal
1. Open PowerShell (Windows) or Terminal (Mac/Linux)
2. Navigate to your project directory:
   ```powershell
   cd C:\Users\patri\Projects\bookijibck
   ```

### 2.2 Set Access Token
```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_4c001c2987d774293b514d4cd5885c8bee308b58"
```

### 2.3 Run Restore Script
Replace `[PATH_TO_BACKUP]` with the actual path to your downloaded backup file:

```powershell
.\scripts\restore-from-backup.ps1 `
  -BackupFile "[PATH_TO_BACKUP]" `
  -NewProjectRef "uradoazoyhhozbemrccj" `
  -DatabasePassword "Bookiji2024!"
```

**Example:**
```powershell
.\scripts\restore-from-backup.ps1 `
  -BackupFile "C:\Users\patri\Downloads\backup-bookiji-2024-06-23.sql" `
  -NewProjectRef "uradoazoyhhozbemrccj" `
  -DatabasePassword "Bookiji2024!"
```

### 2.4 Wait for Restoration
- The script will:
  1. Connect to the new project database
  2. Restore all data from the backup
  3. Show progress messages
- This may take several minutes depending on backup size
- **Don't close the terminal** until it's complete

### 2.5 Verify Success
You should see:
```
✅ Database restored successfully!
🔗 Project URL: https://uradoazoyhhozbemrccj.supabase.co
```

**✅ Step 2 Complete when:** You see the success message

---

## Step 3: Apply Database Migrations

### 3.1 Check Migration Status
```powershell
supabase db push
```

### 3.2 Review Output
- If migrations are needed, they will be applied automatically
- If you see "No changes detected", that's fine - it means the backup already included the schema

**✅ Step 3 Complete when:** Migrations are applied (or confirmed no changes needed)

---

## Step 4: Get API Keys (if needed)

### 4.1 Check if Keys are Already Retrieved
We already have the keys from the CLI setup. They're in `NEW_PROJECT_SETUP_COMPLETE.md`.

### 4.2 Alternative: Get from Dashboard
If you need to verify or get the secret key:
1. Go to: **https://supabase.com/dashboard/project/uradoazoyhhozbemrccj/settings/api**
2. Copy the keys:
   - **Project URL**: `https://uradoazoyhhozbemrccj.supabase.co`
   - **anon/public key**: For `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **service_role key**: For `SUPABASE_SERVICE_ROLE_KEY`

**✅ Step 4 Complete when:** You have all API keys

---

## Step 5: Update Environment Variables

### 5.1 Open `.env.local` File
1. In your project root, open or create `.env.local`
2. If it doesn't exist, copy from `env.template`:
   ```powershell
   Copy-Item env.template .env.local
   ```

### 5.2 Update Supabase Configuration
Update these variables in `.env.local`:

```env
# New Project Configuration
SUPABASE_URL=https://uradoazoyhhozbemrccj.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://uradoazoyhhozbemrccj.supabase.co

# API Keys (from Step 4 or NEW_PROJECT_SETUP_COMPLETE.md)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_E5HX8sFsapD2Qn2fsdd1Kw_ikzHofuz
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyYWRvYXpveWhob3piZW1yY2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTg1OTYsImV4cCI6MjA4MTgzNDU5Nn0.ofJNCe4yD3Z_ZgAuuPdHE6mKDJBqf5wbd5MU-MMILnQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyYWRvYXpveWhob3piZW1yY2NqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjI1ODU5NiwiZXhwIjoyMDgxODM0NTk2fQ.ZqDpwTzkGbirFxrCXWP5FNE0ehNWkasa7AM6BnwVXkw

# Database
DATABASE_URL=postgresql://postgres:Bookiji2024!@db.uradoazoyhhozbemrccj.supabase.co:5432/postgres
```

### 5.3 Save the File
Save `.env.local` after making changes

**✅ Step 5 Complete when:** `.env.local` is updated with new project keys

---

## Step 6: Verify Data Restoration

### 6.1 Check Database Tables
Open Supabase SQL Editor:
1. Go to: **https://supabase.com/dashboard/project/uradoazoyhhozbemrccj/sql/new**
2. Run these queries to verify data:

```sql
-- Check profiles
SELECT COUNT(*) as profile_count FROM profiles;

-- Check bookings
SELECT COUNT(*) as booking_count FROM bookings;

-- Check services
SELECT COUNT(*) as service_count FROM services;

-- Check recent bookings
SELECT id, created_at, status FROM bookings ORDER BY created_at DESC LIMIT 5;
```

### 6.2 Verify Expected Data
- Compare the counts with what you expect from the old project
- If counts are 0, the backup might not have restored correctly
- If counts match, you're good! ✅

**✅ Step 6 Complete when:** You see your data in the database

---

## Step 7: Test Application Connection

### 7.1 Start Development Server
```powershell
pnpm dev
```

### 7.2 Check for Errors
- Watch the terminal for any Supabase connection errors
- If you see connection errors, double-check your `.env.local` file

### 7.3 Test API Endpoint
Open a new terminal and test:
```powershell
# Test Supabase connection
curl https://uradoazoyhhozbemrccj.supabase.co/rest/v1/ `
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyYWRvYXpveWhob3piZW1yY2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTg1OTYsImV4cCI6MjA4MTgzNDU5Nn0.ofJNCe4yD3Z_ZgAuuPdHE6mKDJBqf5wbd5MU-MMILnQ"
```

**✅ Step 7 Complete when:** Application connects without errors

---

## Step 8: Update Production Environment (if applicable)

### 8.1 Update Vercel Environment Variables
If you're using Vercel:
1. Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**
2. Update these variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
3. Redeploy your application

### 8.2 Update Railway Environment Variables
If you're using Railway:
1. Go to: **Railway Dashboard → Your Project → Variables**
2. Update the same variables as above
3. Redeploy if needed

### 8.3 Update GitHub Secrets (for CI/CD)
If you have GitHub Actions:
1. Go to: **GitHub Repo → Settings → Secrets and variables → Actions**
2. Update any Supabase-related secrets

**✅ Step 8 Complete when:** Production environment variables are updated

---

## Step 9: Final Verification

### 9.1 Test Key Features
1. **Authentication**: Try logging in
2. **Bookings**: Check if bookings load
3. **Database**: Verify data appears in the app
4. **API**: Test API endpoints

### 9.2 Check Logs
- Monitor application logs for any errors
- Check Supabase dashboard for any issues

**✅ Step 9 Complete when:** Everything works as expected

---

## 🎉 Completion Checklist

- [ ] Step 1: Backup downloaded
- [ ] Step 2: Backup restored to new project
- [ ] Step 3: Migrations applied
- [ ] Step 4: API keys retrieved
- [ ] Step 5: Environment variables updated
- [ ] Step 6: Data verified in database
- [ ] Step 7: Application connects successfully
- [ ] Step 8: Production environment updated (if applicable)
- [ ] Step 9: All features tested and working

---

## 🆘 Troubleshooting

### Backup won't download
- Check if you're logged into the correct Supabase account
- Try a different browser
- Check browser download settings

### Restore script fails
- Verify the backup file path is correct
- Check that the database password is correct: `Bookiji2024!`
- Ensure the new project is active (check dashboard)

### No data after restore
- Check the backup file size (should be > 0)
- Verify the restore script completed successfully
- Check Supabase dashboard SQL editor to see if tables exist

### Connection errors
- Double-check `.env.local` file has correct keys
- Verify keys match the new project (not old project)
- Restart the development server after updating `.env.local`

### Need Help?
- Check `NEW_PROJECT_SETUP_COMPLETE.md` for all configuration details
- Review `docs/deployment/RESTORE_PAUSED_PROJECT.md` for detailed guide
- Check Supabase dashboard for project status

---

## 📞 Quick Reference

**New Project Dashboard**: https://supabase.com/dashboard/project/uradoazoyhhozbemrccj  
**Old Project (for backup)**: https://supabase.com/dashboard/project/lzgynywojluwdccqkeop  
**Project Reference**: `uradoazoyhhozbemrccj`  
**Database Password**: `Bookiji2024!`

---

**Ready to start? Begin with Step 1!** 🚀
























