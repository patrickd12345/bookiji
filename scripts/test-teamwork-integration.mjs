#!/usr/bin/env node
/**
 * Test script for Teamwork.com ↔ ChatGPT integration
 * 
 * Usage:
 *   node scripts/test-teamwork-integration.mjs
 * 
 * Requires:
 *   - TEAMWORK_API_KEY and TEAMWORK_SUBDOMAIN in .env
 *   - Server running on localhost:3000
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testEndpoint(name, endpoint, body) {
  console.log(`\n🧪 Testing ${name}...`);
  console.log(`   POST ${BASE_URL}${endpoint}`);
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ Success (${response.status})`);
      console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 500));
      return true;
    } else {
      console.log(`   ❌ Failed (${response.status})`);
      console.log(`   Error:`, data.error || data);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Teamwork.com ↔ ChatGPT Integration\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  // Check if environment variables are set
  if (!process.env.TEAMWORK_API_KEY || !process.env.TEAMWORK_SUBDOMAIN) {
    console.log('⚠️  Warning: TEAMWORK_API_KEY and/or TEAMWORK_SUBDOMAIN not set');
    console.log('   The API will return 503 errors, but we can test the endpoints\n');
  }

  const results = [];

  // Test 1: Query endpoint
  results.push(await testEndpoint(
    'Query Endpoint',
    '/api/integrations/teamwork/query',
    {
      question: 'What tasks are due this week?',
      context: {
        includeCompleted: false,
      },
    }
  ));

  // Test 2: Summary endpoint
  results.push(await testEndpoint(
    'Summary Endpoint',
    '/api/integrations/teamwork/summary',
    {
      includeCompleted: false,
    }
  ));

  // Test 3: Search endpoint
  results.push(await testEndpoint(
    'Search Endpoint',
    '/api/integrations/teamwork/search',
    {
      question: 'Show me all tasks related to authentication',
    }
  ));

  // Test 4: Webhook endpoint (should accept any payload)
  results.push(await testEndpoint(
    'Webhook Endpoint',
    '/api/integrations/teamwork/webhook',
    {
      type: 'task.created',
      data: {
        taskId: '123',
        projectId: '456',
      },
    }
  ));

  // Summary
  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log(`\n📊 Test Results: ${passed}/${total} passed\n`);

  if (passed === total) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
