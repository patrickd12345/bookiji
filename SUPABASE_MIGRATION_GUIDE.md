# 🚀 Supabase Key Model Migration Guide

## 📋 **Overview**
This guide helps you migrate from the old Supabase key model to the new `sb_publishable_` and `sb_secret_` key model with zero downtime.

## 🔑 **Key Changes**

### **Old Model (Deprecated)**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **New Model (Recommended)**
```bash
SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

## 🚀 **Migration Steps**

### **Step 1: Update Environment Variables**
1. **Keep existing variables** (for backward compatibility)
2. **Add new variables** alongside existing ones
3. **Test thoroughly** before removing old ones

```bash
# .env.local (add these alongside existing ones)
SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...

# Keep these for now (will be removed after migration)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Step 2: Update Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the new keys:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **service_role secret** → `SUPABASE_SECRET_KEY`

### **Step 3: Deploy with New Keys**
1. Deploy your application with both old and new keys
2. Verify everything works correctly
3. Monitor for any issues

### **Step 4: Remove Old Keys (After Verification)**
1. Remove old environment variables
2. Update any hardcoded references
3. Deploy the clean version

## 🔧 **Code Changes Made**

### **1. Centralized Configuration (`src/config/supabase.ts`)**
- Handles both old and new key models
- Provides migration status information
- Centralizes all Supabase configuration logic

### **2. Updated Client Files**
- `src/lib/supabaseClient.ts` - Frontend client (publishable key)
- `src/lib/supabaseServerClient.ts` - Backend client (secret key)
- `src/app/api/_utils/auth.ts` - Auth utilities

### **3. Test Updates**
- All tests now use new environment variable names
- Backward compatibility maintained during transition

## ✅ **Verification Checklist**

- [ ] New environment variables are set
- [ ] Application starts without errors
- [ ] All Supabase operations work correctly
- [ ] Tests pass with new configuration
- [ ] No console errors related to missing keys
- [ ] Authentication flows work properly
- [ ] Database operations function correctly

## 🚨 **Rollback Plan**

If issues arise during migration:

1. **Immediate Rollback**: Revert to old environment variables
2. **Code Rollback**: Revert code changes if necessary
3. **Investigation**: Debug the specific issue
4. **Re-attempt**: Fix the issue and try migration again

## 📊 **Migration Status**

The migration system automatically detects which key model you're using:

```typescript
import { isUsingNewKeyModel, getEnvironmentVariableNames } from '@/config/supabase';

// Check if new model is active
if (isUsingNewKeyModel()) {
  console.log('✅ Using new Supabase key model');
} else {
  console.log('⚠️  Using legacy Supabase key model');
}

// Get current environment variable status
const envStatus = getEnvironmentVariableNames();
console.log('Current config:', envStatus.current);
console.log('Recommended config:', envStatus.recommended);
```

## 🔍 **Troubleshooting**

### **Common Issues**

1. **"Missing environment variable" errors**
   - Ensure both old and new variables are set during migration
   - Check for typos in variable names

2. **Authentication failures**
   - Verify the new keys are correct
   - Check that the project URL matches

3. **Database connection issues**
   - Ensure the secret key has proper permissions
   - Verify RLS policies are configured correctly

### **Debug Commands**

```bash
# Check environment variables
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'New model active' : 'Legacy model active')"

# Validate configuration
npm run build  # Should work with new keys
```

## 📞 **Support**

If you encounter issues during migration:

1. Check the Supabase documentation for the latest key model information
2. Verify your project settings in the Supabase dashboard
3. Ensure all environment variables are properly set
4. Test with a simple Supabase client connection first

## 🎯 **Next Steps**

After successful migration:

1. **Monitor performance** - New keys may have different rate limits
2. **Update documentation** - Remove references to old key model
3. **Team training** - Ensure all developers use new variable names
4. **Security review** - Verify secret keys are properly protected

---

**Migration completed successfully! 🎉**

Your application now uses the modern Supabase key model with full backward compatibility.
