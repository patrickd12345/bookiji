#!/usr/bin/env node
/**
 * Smoke test for Vercel AI Gateway
 * Tests both embeddings and chat completions
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const VERCEL_AI_BASE_URL = process.env.VERCEL_AI_BASE_URL || 'https://ai-gateway.vercel.sh';
const VERCEL_AI_KEY = process.env.VERCEL_AI_KEY || process.env.AI_GATEWAY_API_KEY;
const VERCEL_AI_MODEL = process.env.VERCEL_AI_MODEL || 'gpt-4o-mini';

console.log('🧪 Vercel AI Gateway Smoke Test\n');
console.log('='.repeat(60));
console.log('Configuration:');
console.log(`  Base URL: ${VERCEL_AI_BASE_URL}`);
console.log(`  Model: ${VERCEL_AI_MODEL}`);
console.log(`  API Key: ${VERCEL_AI_KEY ? `${VERCEL_AI_KEY.substring(0, 10)}...` : '❌ MISSING'}`);
console.log('='.repeat(60));
console.log('');

if (!VERCEL_AI_KEY) {
  console.error('❌ VERCEL_AI_KEY or AI_GATEWAY_API_KEY is required');
  console.error('   Set it in .env.local:');
  console.error('   VERCEL_AI_KEY=your_key_here');
  process.exit(1);
}

const auth = { Authorization: `Bearer ${VERCEL_AI_KEY}` };

async function testChatCompletion() {
  console.log('📝 Test 1: Chat Completion');
  console.log('   Testing: Simple question/answer\n');
  
  try {
    const endpoint = `${VERCEL_AI_BASE_URL}/v1/chat/completions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth,
      },
      body: JSON.stringify({
        model: VERCEL_AI_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "Hello, Vercel AI Gateway is working!" and nothing else.' }
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${errorText}`;
      
      // Provide helpful message for credit card requirement
      if (response.status === 403 && errorText.includes('credit card')) {
        errorMessage += '\n\n💡 Vercel AI Gateway requires a credit card to be added to your account.\n   Visit: https://vercel.com/dashboard/settings/billing';
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('   ✅ Chat completion successful');
    console.log(`   Response: "${content}"`);
    console.log(`   Model: ${data.model || VERCEL_AI_MODEL}`);
    console.log(`   Tokens: ${data.usage?.total_tokens || 'N/A'}`);
    console.log('');
    
    return true;
  } catch (error) {
    console.error('   ❌ Chat completion failed:', error.message);
    console.log('');
    return false;
  }
}

async function testEmbeddings() {
  console.log('🔢 Test 2: Embeddings');
  console.log('   Testing: Generate embedding for "test query"\n');
  
  try {
    const endpoint = `${VERCEL_AI_BASE_URL}/v1/embeddings`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: 'test query',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${errorText}`;
      
      // Provide helpful message for credit card requirement
      if (response.status === 403 && errorText.includes('credit card')) {
        errorMessage += '\n\n💡 Vercel AI Gateway requires a credit card to be added to your account.\n   Visit: https://vercel.com/dashboard/settings/billing';
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const embedding = data.data?.[0]?.embedding;
    
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response format');
    }
    
    console.log('   ✅ Embedding generation successful');
    console.log(`   Dimensions: ${embedding.length}`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}, ...]`);
    console.log(`   Model: ${data.model || 'text-embedding-3-small'}`);
    console.log('');
    
    return true;
  } catch (error) {
    console.error('   ❌ Embedding generation failed:', error.message);
    console.log('');
    return false;
  }
}

async function testSupportLLMService() {
  console.log('🤖 Test 3: Support LLM Service Integration');
  console.log('   Testing: Using getLLMService() and getEmbeddingService()\n');
  
  try {
    // Use tsx to run TypeScript files
    const { execSync } = await import('child_process');
    const { join } = await import('path');
    
    // Create a test script that can be run with tsx
    const testScript = `
import { getLLMService, getEmbeddingService } from './src/lib/support/llm-service';

async function test() {
  try {
    console.log('   Testing embedding service...');
    const embeddingService = getEmbeddingService();
    const embedding = await embeddingService.getEmbedding('test query for support');
    console.log(\`   ✅ Embedding generated: \${embedding.length} dimensions\`);
    
    console.log('   Testing LLM service...');
    const llmService = getLLMService();
    const answer = await llmService.generateAnswer(
      'You are a helpful assistant.',
      'Say "Support service is working!" and nothing else.'
    );
    console.log(\`   ✅ LLM answer generated: "\${answer.substring(0, 50)}\${answer.length > 50 ? '...' : ''}"\`);
    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('   ❌ Support LLM service test failed:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack.split('\\n').slice(0, 3).join('\\n'));
    }
    console.log('');
    process.exit(1);
  }
}

test();
`;
    
    // Write temp test file
    const fs = await import('fs');
    const tempFile = join(__dirname, '..', 'temp-support-test.ts');
    fs.writeFileSync(tempFile, testScript);
    
    try {
      // Run with tsx
      execSync(`npx tsx ${tempFile}`, { 
        stdio: 'inherit',
        cwd: join(__dirname, '..'),
      });
      
      // Clean up
      fs.unlinkSync(tempFile);
      return true;
    } catch (execError) {
      // Clean up on error
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      throw execError;
    }
  } catch (error) {
    console.error('   ❌ Support LLM service test failed:', error.message);
    console.error('   Note: This requires tsx to be installed (pnpm add -D tsx)');
    console.log('');
    return false;
  }
}

async function runTests() {
  const results = {
    chat: false,
    embeddings: false,
    supportService: false,
  };

  results.chat = await testChatCompletion();
  results.embeddings = await testEmbeddings();
  results.supportService = await testSupportLLMService();

  console.log('='.repeat(60));
  console.log('📊 Test Results Summary\n');
  console.log(`   Chat Completion:     ${results.chat ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Embeddings:          ${results.embeddings ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Support Service:     ${results.supportService ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(60));
  console.log('');

  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('✅ All tests passed! Vercel AI Gateway is working correctly.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Check the errors above.');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('❌ Fatal error running tests:', error);
  process.exit(1);
});
