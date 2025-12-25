# Adding sched.bookiji.com Subdomain to Vercel

## Quick Setup

Once authenticated with your Vercel account (patrick-duchesneaus-projects), run:

```bash
# 1. Link the project (if not already linked)
vercel link --yes

# 2. Add the subdomain
vercel domains add sched.bookiji.com

# 3. Verify it was added
vercel domains ls
```

## Authentication

If you need to authenticate:

```bash
# Login interactively
vercel login

# Or use a token
vercel login --token YOUR_VERCEL_TOKEN
```

## DNS Configuration

After adding the domain in Vercel, you'll need to configure DNS:

1. **Get the DNS records from Vercel:**
   ```bash
   vercel domains inspect sched.bookiji.com
   ```

2. **Add CNAME record in your DNS provider:**
   - Type: `CNAME`
   - Name: `sched`
   - Value: `cname.vercel-dns.com` (or the value provided by Vercel)
   - TTL: `3600` (or default)

## Verification

Once DNS propagates (usually 5-10 minutes):

```bash
# Check domain status
vercel domains inspect sched.bookiji.com

# Test the subdomain
curl -I https://sched.bookiji.com
```

## Current Project Info

- **Project ID**: `prj_oujpwJF7borILCg9aZpnsulrrBrf`
- **Org ID**: `team_QagTypZXKEbPx8eydWnvEl3v`
- **Project Name**: `bookiji`

## Notes

- Vercel will automatically provision SSL certificates for the subdomain
- The subdomain will point to the same deployment as the main domain
- No code changes needed - Next.js will serve the same app on both domains

