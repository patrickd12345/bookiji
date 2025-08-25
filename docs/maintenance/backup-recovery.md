# Backup and Recovery

## Creating a Backup

Run:

```bash
node scripts/backup-database.js
```

This uses `DATABASE_URL` to create a SQL dump with the current date in the filename.

## Restoring a Backup

```bash
node scripts/restore-database.js <backup-file>
```

Provide the path to a previous backup file to restore the database.

## Notes

- Ensure backups run daily via cron or an external scheduler.
- Regularly test restore procedures to verify backup integrity.
