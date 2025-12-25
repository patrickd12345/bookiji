# Add sched.bookiji.com - Quick Commands

## Single Command Block (PowerShell)

```powershell
# Remove old .vercel if exists
Remove-Item -Recurse -Force .vercel -ErrorAction SilentlyContinue

# Login (interactive - follow prompts)
vercel login

# Link project (select 'bookiji' when prompted)
vercel link

# Add subdomain
vercel domains add sched.bookiji.com

# Verify
vercel domains ls

# Get DNS instructions
vercel domains inspect sched.bookiji.com
```

## Or Use the Script

```powershell
.\add-sched-subdomain.ps1
```

## After Adding Domain

1. Vercel will show DNS instructions
2. Add CNAME record in your DNS provider:
   - Type: `CNAME`
   - Name: `sched`
   - Value: (from Vercel output)
   - TTL: `3600`
3. Wait 5-10 minutes for DNS propagation
4. SSL certificate will auto-provision

