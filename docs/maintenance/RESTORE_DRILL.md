# Database Restore Drill

## 🚨 Emergency Database Recovery Procedure

### Prerequisites
- Access to the production environment
- Valid backup file (e.g., `backup-2025-01-16.sql`)
- Database connection credentials

### Step 1: Verify Backup File
```bash
# Check backup file exists and has content
ls -la backup-*.sql
head -5 backup-2025-01-16.sql
```

### Step 2: Stop Application
```bash
# Stop the application to prevent data corruption
# This depends on your deployment method
# For Railway: railway service down
# For Vercel: redeploy with maintenance mode
```

### Step 3: Restore Database
```bash
# Restore from backup
node scripts/restore-database.js backup-2025-01-16.sql
```

### Step 4: Verify Restore
```bash
# Check critical tables have data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM profiles;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM bookings;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM services;"
```

### Step 5: Restart Application
```bash
# Restart the application
# For Railway: railway service up
# For Vercel: redeploy normally
```

### Step 6: Verify Functionality
- Check health endpoint: `/api/health`
- Verify user authentication works
- Test basic booking flow
- Check admin dashboard access

## 🔄 Regular Restore Testing

### Monthly Restore Drill
1. **Schedule**: First Monday of each month
2. **Duration**: 30 minutes
3. **Participants**: DevOps team
4. **Goal**: Ensure restore procedure works correctly

### Test Restore Process
```bash
# 1. Create test backup
node scripts/backup-database.js

# 2. Restore to test environment
node scripts/restore-database.js backup-test.sql

# 3. Verify data integrity
# 4. Document any issues
```

## 📋 Recovery Checklist

- [ ] Backup file verified and accessible
- [ ] Application stopped
- [ ] Database restored successfully
- [ ] Data integrity verified
- [ ] Application restarted
- [ ] Core functionality tested
- [ ] Incident documented
- [ ] Root cause analysis completed

## 🆘 Emergency Contacts

- **DevOps Lead**: [Contact Info]
- **Database Admin**: [Contact Info]
- **On-Call Engineer**: [Contact Info]

## 📚 Additional Resources

- [Backup and Recovery Guide](./backup-recovery.md)
- [Database Schema Documentation](./database-schema.md)
- [Maintenance Guide](./MAINTENANCE_GUIDE.md)
