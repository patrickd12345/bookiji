#!/usr/bin/env node
/**
 * Refresh api_metrics_5m materialized view in LOCAL Supabase
 */

import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Local Supabase connection (from config.toml)
const localDbUrl = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';

async function refreshApiMetrics() {
  console.log('🔄 Refreshing api_metrics_5m materialized view...\n');
  console.log('📡 Connecting to: postgresql://postgres:***@127.0.0.1:55322/postgres\n');

  const client = new Pool({
    connectionString: localDbUrl,
    ssl: false
  });

  try {
    // Check if view exists
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM pg_matviews 
        WHERE matviewname = 'api_metrics_5m'
      ) as exists;
    `);

    if (!checkResult.rows[0].exists) {
      console.error('❌ Materialized view api_metrics_5m does not exist!');
      console.error('   Run migrations first: pnpm db:push');
      process.exit(1);
    }

    console.log('✅ Materialized view exists\n');
    
    // Check if view is populated
    const checkPopulated = await client.query(`
      SELECT COUNT(*) as count FROM api_metrics_5m;
    `);
    const isPopulated = parseInt(checkPopulated.rows[0].count) > 0;

    if (!isPopulated) {
      console.log('📝 View is not populated. Performing initial refresh (non-concurrent)...\n');
      const startTime = Date.now();
      await client.query('REFRESH MATERIALIZED VIEW api_metrics_5m;');
      const duration = Date.now() - startTime;
      console.log(`✅ Initial refresh completed in ${duration}ms\n`);
    } else {
      console.log('📝 Refreshing view (concurrent)...\n');
      const startTime = Date.now();
      await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY api_metrics_5m;');
      const duration = Date.now() - startTime;
      console.log(`✅ Refresh completed in ${duration}ms\n`);
    }

    // Check row count
    const countResult = await client.query('SELECT COUNT(*) as count FROM api_metrics_5m;');
    const rowCount = countResult.rows[0].count;

    console.log('✅ Materialized view refreshed successfully!\n');
    console.log(`📊 Rows in view: ${rowCount}\n`);

    if (rowCount === '0') {
      console.log('⚠️  Warning: View is empty. This might mean:');
      console.log('   - No performance_metrics data exists yet');
      console.log('   - The view needs data to be populated from performance_metrics table\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure Supabase is running locally:');
      console.error('   Run: pnpm db:start');
      console.error('   Or: supabase start');
    } else if (error.message.includes('has not been populated')) {
      console.error('\n💡 The view needs to be populated. Trying initial refresh...');
      try {
        await client.query('REFRESH MATERIALIZED VIEW api_metrics_5m;');
        console.log('✅ Initial refresh successful!');
        
        // Check row count after refresh
        const countResult = await client.query('SELECT COUNT(*) as count FROM api_metrics_5m;');
        const rowCount = countResult.rows[0].count;
        console.log(`📊 Rows in view: ${rowCount}\n`);
        
        if (rowCount === '0') {
          console.log('⚠️  Warning: View is empty. This might mean:');
          console.log('   - No performance_metrics data exists yet');
          console.log('   - The view needs data to be populated from performance_metrics table\n');
        }
        process.exit(0);
      } catch (refreshError) {
        console.error('❌ Initial refresh failed:', refreshError.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

refreshApiMetrics();
