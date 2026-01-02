#!/usr/bin/env node
import readline from 'node:readline';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

console.log('🔧 Bookiji Production Supabase Key Fixer');
console.log('========================================');
console.log('This script will help you fix the "Unregistered API key" error in Production.');
console.log('It ensures the PROD_SUPABASE_* environment variables are correctly set in Vercel.\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  // Check for Vercel CLI
  let hasVercel = false;
  try {
    execSync('npx vercel --version', { stdio: 'ignore' });
    hasVercel = true;
    console.log('✅ Vercel CLI detected.');
  } catch (e) {
    console.log('⚠️  Vercel CLI not found or not authenticated.');
    console.log('   You will need to manually configure variables or install Vercel CLI later.');
  }

  console.log('\nPlease retrieve your PRODUCTION Supabase credentials from the Supabase Dashboard.');
  console.log('Go to: Project Settings -> API\n');

  const url = await question('Enter Production Supabase URL (https://...): ');
  const anonKey = await question('Enter Production Supabase Anon/Public Key: ');
  const serviceKey = await question('Enter Production Supabase Service/Secret Key (optional, press Enter to skip): ');

  if (!url || !anonKey) {
    console.error('❌ URL and Anon Key are required.');
    process.exit(1);
  }

  console.log('\nApplying configuration...');

  if (hasVercel) {
    try {
      console.log('Setting PROD_SUPABASE_URL...');
      execSync(`npx vercel env add PROD_SUPABASE_URL production "${url}"`, { stdio: 'inherit' });
      
      console.log('Setting PROD_SUPABASE_PUBLISHABLE_KEY...');
      execSync(`npx vercel env add PROD_SUPABASE_PUBLISHABLE_KEY production "${anonKey}"`, { stdio: 'inherit' });

      if (serviceKey) {
        console.log('Setting PROD_SUPABASE_SECRET_KEY...');
        execSync(`npx vercel env add PROD_SUPABASE_SECRET_KEY production "${serviceKey}"`, { stdio: 'inherit' });
      }

      console.log('\n✅ Successfully updated Vercel Production Environment Variables.');
      console.log('🚀 Redeploying to Production to apply changes...');
      
      const deploy = await question('Do you want to redeploy now? (y/n): ');
      if (deploy.toLowerCase() === 'y') {
        execSync('npx vercel deploy --prod', { stdio: 'inherit' });
      } else {
        console.log('Skipping deployment. Run `npx vercel deploy --prod` when ready.');
      }
    } catch (e) {
      console.error('\n❌ Failed to update Vercel via CLI. Falling back to .env file generation.');
      generateEnvFile(url, anonKey, serviceKey);
    }
  } else {
    generateEnvFile(url, anonKey, serviceKey);
  }

  rl.close();
}

function generateEnvFile(url, anonKey, serviceKey) {
  const envContent = [
    `PROD_SUPABASE_URL=${url}`,
    `PROD_SUPABASE_PUBLISHABLE_KEY=${anonKey}`,
    serviceKey ? `PROD_SUPABASE_SECRET_KEY=${serviceKey}` : ''
  ].filter(Boolean).join('\n');

  const filePath = path.join(process.cwd(), '.env.production.local.fix');
  fs.writeFileSync(filePath, envContent);

  console.log('\n⚠️  Could not apply changes automatically.');
  console.log(`✅ Generated fix file: ${filePath}`);
  console.log('\nPLEASE DO THE FOLLOWING MANUALLY:');
  console.log('1. Go to Vercel Dashboard -> Project Settings -> Environment Variables');
  console.log('2. Add the following variables (Scope: Production):');
  console.log(`   PROD_SUPABASE_URL = ${url}`);
  console.log(`   PROD_SUPABASE_PUBLISHABLE_KEY = ${anonKey}`);
  if (serviceKey) console.log(`   PROD_SUPABASE_SECRET_KEY = ${serviceKey}`);
  console.log('3. Redeploy the application.');
}

main().catch(console.error);
