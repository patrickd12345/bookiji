# Quick Start: Restore Bookiji Project

## ✅ What's Done

1. **New Supabase project created**: `uradoazoyhhozbemrccj` (Bookiji-Restored)
2. **Project linked** to local repository
3. **Restoration script created**: `scripts/restore-from-backup.ps1`
4. **Documentation created**: `docs/deployment/RESTORE_PAUSED_PROJECT.md`

## 🚀 Next Steps (5 minutes)

### Step 1: Download Backup
1. Go to: https://supabase.com/dashboard/project/lzgynywojluwdccqkeop
2. Click **"Download backups"**
3. Download the database backup SQL file
4. Save it locally (e.g., `backup-bookiji-2024-06-23.sql`)

### Step 2: Restore Backup
```powershell
# Set access token
$env:SUPABASE_ACCESS_TOKEN = "sbp_4c001c2987d774293b514d4cd5885c8bee308b58"

# Restore backup
.\scripts\restore-from-backup.ps1 `
  -BackupFile "path/to/backup-bookiji-2024-06-23.sql" `
  -NewProjectRef "uradoazoyhhozbemrccj" `
  -DatabasePassword "Bookiji2024!"
```

### Step 3: Get API Keys
1. Go to: https://supabase.com/dashboard/project/uradoazoyhhozbemrccj/settings/api
2. Copy:
   - **Project URL**: `https://uradoazoyhhozbemrccj.supabase.co`
   - **anon/public key**: For `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **service_role key**: For `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: Update Environment
Update `.env.local` with new project keys:
```env
NEXT_PUBLIC_SUPABASE_URL=https://uradoazoyhhozbemrccj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[from dashboard]
SUPABASE_SERVICE_ROLE_KEY=[from dashboard]
```

## 📋 Project Information

| Item | Value |
|------|-------|
| **Old Project** | `lzgynywojluwdccqkeop` (paused) |
| **New Project** | `uradoazoyhhozbemrccj` (active) |
| **Organization** | `nydhlxaqetemxrvtmokm` |
| **Region** | us-east-1 |
| **Database Password** | `Bookiji2024!` |
| **Status** | ✅ ACTIVE_HEALTHY |

## 🔗 Useful Links

- **New Project Dashboard**: https://supabase.com/dashboard/project/uradoazoyhhozbemrccj
- **Old Project (for backup)**: https://supabase.com/dashboard/project/lzgynywojluwdccqkeop
- **API Settings**: https://supabase.com/dashboard/project/uradoazoyhhozbemrccj/settings/api
- **Full Documentation**: `docs/deployment/RESTORE_PAUSED_PROJECT.md`

## ⚠️ Important Notes

- The old project cannot be restored (paused >90 days)
- All data is safe in the backup file
- Verify restoration before deleting backups
- Update all deployment environments (Vercel, Railway, etc.)





