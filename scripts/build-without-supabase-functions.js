#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, renameSync, copyFileSync, rmSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const SUPABASE_FUNCTION_FILE = 'supabase/functions/kb-index/index.ts';
const TEMP_FILE = 'supabase/functions/kb-index/index.ts.bak';
const TEMP_DIR = 'supabase/functions.temp';

console.log('🚀 Starting build process...');
console.log(`📁 Working directory: ${process.cwd()}`);

let functionFileMoved = false;
let functionDirMoved = false;

try {
  // Strategy 1: Try to rename the specific function file
  if (existsSync(SUPABASE_FUNCTION_FILE)) {
    console.log('📁 Temporarily renaming Supabase function file...');
    renameSync(SUPABASE_FUNCTION_FILE, TEMP_FILE);
    functionFileMoved = true;
    console.log('✅ Supabase function file renamed temporarily');
  }

  // Strategy 2: If the file approach didn't work, try moving the entire functions directory
  if (!functionFileMoved && existsSync('supabase/functions')) {
    console.log('📁 Moving entire Supabase functions directory...');
    
    // Create temp directory
    if (!existsSync(TEMP_DIR)) {
      mkdirSync(TEMP_DIR, { recursive: true });
    }
    
    // Copy the functions directory to temp
    copyFileSync('supabase/functions', TEMP_DIR, { recursive: true });
    
    // Remove the original functions directory
    rmSync('supabase/functions', { recursive: true, force: true });
    
    functionDirMoved = true;
    console.log('✅ Supabase functions directory moved temporarily');
  }

  // Run the actual Next.js build
  console.log('🔨 Running Next.js build...');
  execSync('next build', { stdio: 'inherit' });
  console.log('✅ Next.js build completed successfully');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  
  // If we moved files, try to restore them before exiting
  if (functionFileMoved || functionDirMoved) {
    console.log('🔄 Attempting to restore files before exit...');
    try {
      if (functionFileMoved && existsSync(TEMP_FILE)) {
        renameSync(TEMP_FILE, SUPABASE_FUNCTION_FILE);
        console.log('✅ Function file restored');
      }
      if (functionDirMoved && existsSync(TEMP_DIR)) {
        mkdirSync('supabase/functions', { recursive: true });
        copyFileSync(TEMP_DIR, 'supabase/functions', { recursive: true });
        rmSync(TEMP_DIR, { recursive: true, force: true });
        console.log('✅ Functions directory restored');
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
    
    if (functionDirMoved && existsSync(TEMP_DIR)) {
      console.log('📁 Restoring Supabase functions directory...');
      
      // Create the functions directory
      mkdirSync('supabase/functions', { recursive: true });
      
      // Copy back from temp
      copyFileSync(TEMP_DIR, 'supabase/functions', { recursive: true });
      
      // Remove temp directory
      rmSync(TEMP_DIR, { recursive: true, force: true });
      
      console.log('✅ Supabase functions directory restored');
    }
  } catch (restoreError) {
    console.warn('⚠️  Warning: Could not restore files:', restoreError.message);
  }
}

console.log('🎉 Build process completed!');
