#!/usr/bin/env node
import readline from 'node:readline';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

console.log('🔧 Bookiji Production Supabase Key Fixer');
console.log('========================================');
console.log('This script will help you fix the "Unregistered API key" error in Production.');
console.log('It ensures the PROD_SUPABASE_* environment variables are correctly set in Vercel.\n');

let rl = null;
const question = (query) => {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
  // Check for command-line arguments or environment variables
  const args = process.argv.slice(2);
  let url, anonKey, serviceKey;
  
  if (args.length >= 2) {
    // Non-interactive mode: use command-line arguments
    url = args[0];
    anonKey = args[1];
    serviceKey = args[2] || '';
    console.log('📝 Using provided credentials (non-interactive mode)\n');
  } else if (process.env.PROD_SUPABASE_URL && process.env.PROD_SUPABASE_PUBLISHABLE_KEY) {
    // Use environment variables if available
    url = process.env.PROD_SUPABASE_URL;
    anonKey = process.env.PROD_SUPABASE_PUBLISHABLE_KEY;
    serviceKey = process.env.PROD_SUPABASE_SECRET_KEY || '';
    console.log('📝 Using environment variables (non-interactive mode)\n');
  } else {
    // Interactive mode
    console.log('\nPlease retrieve your PRODUCTION Supabase credentials from the Supabase Dashboard.');
    console.log('Go to: Project Settings -> API\n');
    url = await question('Enter Production Supabase URL (https://...): ');
    anonKey = await question('Enter Production Supabase Anon/Public Key: ');
    serviceKey = await question('Enter Production Supabase Service/Secret Key (optional, press Enter to skip): ');
  }

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

  if (!url || !anonKey) {
    console.error('❌ URL and Anon Key are required.');
    process.exit(1);
  }

  console.log('\nApplying configuration...');

  if (hasVercel) {
    try {
      console.log('Setting PROD_SUPABASE_URL...');
      // Vercel CLI prompts for value, so we pipe it via stdin
      execSync(`echo "${url}" | npx vercel env add PROD_SUPABASE_URL production`, { 
        stdio: 'inherit',
        shell: true 
      });
      
      console.log('Setting PROD_SUPABASE_PUBLISHABLE_KEY...');
      execSync(`echo "${anonKey}" | npx vercel env add PROD_SUPABASE_PUBLISHABLE_KEY production`, { 
        stdio: 'inherit',
        shell: true 
      });

      if (serviceKey) {
        console.log('Setting PROD_SUPABASE_SECRET_KEY...');
        execSync(`echo "${serviceKey}" | npx vercel env add PROD_SUPABASE_SECRET_KEY production`, { 
          stdio: 'inherit',
          shell: true 
        });
      }

      console.log('\n✅ Successfully updated Vercel Production Environment Variables.');
      console.log('🚀 Redeploying to Production to apply changes...');
      
      // In non-interactive mode, skip deployment prompt (user can deploy manually)
      const isNonInteractive = args.length >= 2 || (process.env.PROD_SUPABASE_URL && process.env.PROD_SUPABASE_PUBLISHABLE_KEY);
      
      if (isNonInteractive) {
        console.log('⚠️  Non-interactive mode: Skipping automatic deployment.');
        console.log('   Run `npx vercel deploy --prod` manually when ready.');
      } else {
        const deploy = await question('Do you want to redeploy now? (y/n): ');
        if (deploy.toLowerCase() === 'y') {
          execSync('npx vercel deploy --prod', { stdio: 'inherit' });
        } else {
          console.log('Skipping deployment. Run `npx vercel deploy --prod` when ready.');
        }
      }
    } catch (e) {
      console.error('\n❌ Failed to update Vercel via CLI. Falling back to .env file generation.');
      generateEnvFile(url, anonKey, serviceKey);
    }
  } else {
    generateEnvFile(url, anonKey, serviceKey);
  }

  if (rl) rl.close();
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
