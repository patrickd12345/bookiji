# Staging Deployment + SimCity Chaos - Setup Instructions

## Quick Start

### Option 1: Use Vercel Token (Recommended)

1. **Get your Vercel token:**
   - Go to: https://vercel.com/account/tokens
   - Create a new token (or use existing)
   - Copy the token

2. **Set the token and run:**
   ```powershell
   $env:VERCEL_TOKEN = "your-token-here"
   powershell -ExecutionPolicy Bypass -File chaos/sessions/deploy-staging-and-run-chaos.ps1
   ```

### Option 2: Interactive Login

1. **Authenticate first:**
   ```powershell
   vercel login
   ```
   This will open your browser for authentication.

2. **Then run the script:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File chaos/sessions/deploy-staging-and-run-chaos.ps1
   ```

## What the Script Does

1. ✅ Verifies Vercel authentication
2. ✅ Links project if needed
3. ✅ Deploys a **preview** (staging) runtime (NOT production)
4. ✅ Verifies deployment is reachable (`/api/health`)
5. ✅ Runs SimCity chaos sessions against staging
6. ✅ Captures all observations (incident IDs, badges, layers, etc.)

## Safety Guarantees

- **NEVER deploys to production** - uses `vercel deploy` (preview only)
- **NEVER uses `--prod` flag**
- **NEVER modifies source code**
- **ONLY creates preview deployments**

## Expected Output

The script will:
- Print the staging deployment URL
- Run all 3 chaos sessions
- Generate observation files in `chaos/sessions/`
- Exit with code 0 if successful, non-zero if validation fails

## Troubleshooting

### "No existing credentials found"
- Run `vercel login` first, OR
- Set `$env:VERCEL_TOKEN` with your token

### "Project not linked"
- The script will attempt to link automatically
- If it fails, run `vercel link` manually

### Health check fails
- Deployment may need a few more seconds
- Check the URL manually: `curl https://your-deployment.vercel.app/api/health`
- Re-run the script

### Chaos sessions fail
- Check that `APP_ENV=staging` is set
- Check that `ENABLE_STAGING_INCIDENTS=true` is set
- Verify the staging URL is correct





