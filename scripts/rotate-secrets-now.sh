#!/bin/bash
# IMMEDIATE SECRETS ROTATION - RUN NOW
# This script cleans up all exposed credentials and provides rotation steps

echo "🚨 CRITICAL: CREDENTIALS EXPOSED - IMMEDIATE ACTION REQUIRED"
echo "================================================================"

echo ""
echo "1️⃣ ROTATE SUPABASE SERVICE ROLE KEY:"
echo "   - Go to Supabase Dashboard → Settings → API"
echo "   - Click 'Regenerate' on Service Role Key"
echo "   - Copy new key and update .env file"
echo "   - Update CI/CD secrets (GitHub Actions, etc.)"

echo ""
echo "2️⃣ ROTATE SUPABASE CLI TOKEN:"
echo "   - Run: supabase logout"
echo "   - Run: supabase login"
echo "   - Update .env with new token"

echo ""
echo "3️⃣ UPDATE ENVIRONMENT FILES:"
echo "   - .env (local development)"
echo "   - .env.local (if exists)"
echo "   - CI/CD environment variables"
echo "   - Docker compose files"

echo ""
echo "4️⃣ CLEAN UP EXPOSED FILES:"
echo "   - Remove hardcoded keys from env.template"
echo "   - Update docker-compose.yml to use env vars only"
echo "   - Check git history for committed secrets"

echo ""
echo "5️⃣ VERIFY CLEANUP:"
echo "   - No hardcoded keys in source code"
echo "   - All secrets use environment variables"
echo "   - CI/CD uses secure secret management"

echo ""
echo "⚠️  WARNING: Old keys are now compromised!"
echo "   - Monitor for unauthorized access"
echo "   - Check audit logs for suspicious activity"
echo "   - Consider additional security measures"

echo ""
echo "🔒 NEXT STEPS:"
echo "   - Run this script after each rotation"
echo "   - Set up automated secret rotation"
echo "   - Implement secret scanning in CI/CD"
echo "   - Use HashiCorp Vault or similar for production"
