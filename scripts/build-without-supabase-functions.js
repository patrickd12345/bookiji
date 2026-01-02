#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, renameSync } from 'fs';
import { join } from 'path';

const SUPABASE_FUNCTION_FILE = 'supabase/functions/kb-index/index.ts';
const TEMP_FILE = 'supabase/functions/kb-index/index.ts.bak';

console.log('🚀 Starting build process...');
console.log(`📁 Working directory: ${process.cwd()}`);

// Ensure APP_ENV is set so environment guards don't fail during builds
if (!process.env.APP_ENV && !process.env.NEXT_PUBLIC_APP_ENV) {
  process.env.APP_ENV = 'local';
  process.env.NEXT_PUBLIC_APP_ENV = 'local';
  console.log('ℹ️  APP_ENV not provided; defaulting to "local" for build-time tasks');
} else if (!process.env.NEXT_PUBLIC_APP_ENV) {
  process.env.NEXT_PUBLIC_APP_ENV = process.env.APP_ENV;
}

let functionFileMoved = false;

try {
  // Strategy: Try to rename the specific function file
  if (existsSync(SUPABASE_FUNCTION_FILE)) {
    console.log('📁 Temporarily renaming Supabase function file...');
    renameSync(SUPABASE_FUNCTION_FILE, TEMP_FILE);
    functionFileMoved = true;
    console.log('✅ Supabase function file renamed temporarily');
  }

  // Run the actual Next.js build
  console.log('🔨 Running Next.js build...');
  execSync('next build', { stdio: 'inherit' });
  console.log('✅ Next.js build completed successfully');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  
  // If we moved files, try to restore them before exiting
  if (functionFileMoved) {
    console.log('🔄 Attempting to restore files before exit...');
    try {
      if (existsSync(TEMP_FILE)) {
        renameSync(TEMP_FILE, SUPABASE_FUNCTION_FILE);
        console.log('✅ Function file restored');
      }
    } catch (restoreError) {
      console.warn('⚠️  Warning: Could not restore files:', restoreError.message);
    }
  }
  
  process.exit(1);
} finally {
  // Restore the files
  try {
    if (functionFileMoved && existsSync(TEMP_FILE)) {
      console.log('📁 Restoring Supabase function file...');
      renameSync(TEMP_FILE, SUPABASE_FUNCTION_FILE);
      console.log('✅ Supabase function file restored');
    }
  } catch (restoreError) {
    console.warn('⚠️  Warning: Could not restore files:', restoreError.message);
  }
}

console.log('🎉 Build process completed!');
