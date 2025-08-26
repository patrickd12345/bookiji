# Supabase Edge Functions Build Fix

## Problem Description

The Vercel build was failing with the following error:

```
Type error: Cannot find module 'https://deno.land/std@0.168.0/http/server.ts' or its corresponding type declarations.
```

This occurred because:

1. **Supabase Edge Functions** use Deno runtime with URL-based imports
2. **Next.js build process** runs in Node.js environment
3. **Deno URLs** are not valid Node.js module paths
4. **TypeScript compiler** tried to resolve these URLs during build

## Root Cause

The issue was in the file `supabase/functions/kb-index/index.ts` which contains:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
```

These Deno-specific imports are incompatible with the Node.js-based Next.js build process.

## Solution Implemented

### 1. Custom Build Script

Created `scripts/build-without-supabase-functions.js` that:

- Temporarily renames/moves Supabase function files during build
- Runs the Next.js build without Deno import conflicts
- Restores the files after successful build

### 2. Package.json Updates

Modified build scripts:

```json
{
  "scripts": {
    "build": "node scripts/build-without-supabase-functions.js",
    "vercel:build": "node scripts/build-without-supabase-functions.js"
  }
}
```

### 3. Configuration Files

#### .vercelignore
```
# Supabase Edge Functions (Deno runtime, not compatible with Node.js build)
supabase/functions/
supabase/functions/**/*
```

#### .gitignore
```
# Supabase Edge Functions (Deno runtime, not compatible with Node.js build)
/supabase/functions/
```

#### tsconfig.json
```json
{
  "exclude": ["node_modules", "supabase/functions/**/*"]
}
```

## How It Works

1. **Pre-build**: Script temporarily renames `supabase/functions/kb-index/index.ts` to `index.ts.bak`
2. **Build**: Next.js build runs without Deno import conflicts
3. **Post-build**: Script restores the original file structure
4. **Result**: Clean build with Supabase functions preserved

## Benefits

✅ **Build Success**: Eliminates Deno import errors  
✅ **File Preservation**: Supabase functions remain intact  
✅ **Automated**: No manual intervention required  
✅ **Robust**: Handles both file and directory scenarios  
✅ **Vercel Compatible**: Works in production deployments  

## Usage

### Local Development
```bash
pnpm run build
```

### Vercel Deployment
The build script automatically runs during Vercel deployments.

### Manual Override
If needed, you can run the original Next.js build:
```bash
npx next build
```

## File Structure

```
scripts/
├── build-without-supabase-functions.js  # Main build script
└── ...

supabase/
├── functions/
│   └── kb-index/
│       └── index.ts                     # Deno Edge Function
└── ...

.vercelignore                             # Vercel build exclusions
.gitignore                               # Git exclusions
tsconfig.json                            # TypeScript exclusions
```

## Troubleshooting

### Build Still Fails
1. Check if Supabase functions directory exists
2. Verify build script permissions
3. Ensure no other Deno imports in the codebase

### File Restoration Issues
1. Check file permissions
2. Verify disk space
3. Look for antivirus interference

### Vercel Deployment Issues
1. Ensure `.vercelignore` is committed
2. Check build script execution
3. Verify package.json scripts

## Future Considerations

1. **Supabase CLI Integration**: Consider using Supabase CLI for function deployment
2. **Build Optimization**: Explore webpack externals for better performance
3. **CI/CD Integration**: Add build validation in pull requests
4. **Monitoring**: Add build success metrics

## Related Files

- `scripts/build-without-supabase-functions.js` - Main build script
- `package.json` - Build script configuration
- `.vercelignore` - Vercel build exclusions
- `.gitignore` - Git exclusions
- `tsconfig.json` - TypeScript configuration
- `supabase/functions/kb-index/index.ts` - Problematic Deno function

## Support

If you encounter issues:

1. Check the build logs for specific error messages
2. Verify the Supabase functions directory structure
3. Ensure all configuration files are properly committed
4. Test the build script locally before deployment

---

*Last updated: $(date)*
*Build script version: 2.0*
