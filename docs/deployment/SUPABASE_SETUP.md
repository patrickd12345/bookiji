# Supabase Setup Guide

## Quick Setup

1. **Create a Supabase project** at https://app.supabase.com
2. **Copy your project keys** from Settings → API
3. **Create `.env.local` file** in the project root:

```env
# Required - Get from Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<YOUR_SUPABASE_PUBLISHABLE_KEY>
SUPABASE_SECRET_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>

# Optional - for full functionality
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MAPBOX_TOKEN=<YOUR_MAPBOX_TOKEN>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<YOUR_STRIPE_PUBLISHABLE_KEY>
STRIPE_SECRET_KEY=<YOUR_STRIPE_SECRET_KEY>
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SECRET_KEY` | ✅ | Supabase service role key |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | 🔶 | Mapbox API key (for maps) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 🔶 | Stripe public key (for payments) |
| `STRIPE_SECRET_KEY` | 🔶 | Stripe secret key (for payments) |

## Database Setup

1. **Run the migrations** in your Supabase project using the CLI only:
   ```bash
   supabase db push
   ```
Manual SQL execution in the dashboard is not allowed. If `supabase db push` fails, resolve it via CLI migration fixes.

## Troubleshooting

### "Missing Supabase environment variables" Error

- Check that `.env.local` exists in project root
- Verify all required variables are set
- Restart the development server after adding variables

### "Refused to connect" CSP Error

- Ensure your Supabase URL matches the CSP policy in `middleware.ts`
- Update the CSP if using a different Supabase instance

### Database Connection Issues

- Verify your Supabase project is active
- Check the secret key has proper permissions
- Ensure the database schema matches the migrations

## Development Mode

For local development without Supabase, set:
```env
FORCE_LOCAL_DB=true
```

This will use local Supabase demo credentials for testing.
