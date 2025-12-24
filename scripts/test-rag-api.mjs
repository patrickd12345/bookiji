#!/usr/bin/env node
/**
 * Test RAG API endpoint
 * Usage: node scripts/test-rag-api.mjs [question]
 */

const question = process.argv[2] || "How do I book a service?";

async function testRAGAPI() {
  console.log('🧪 Testing RAG API...\n');
  console.log(`Question: "${question}"\n`);

  try {
    const response = await fetch('http://localhost:3000/api/support/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error (${response.status}):`, errorText);
      process.exit(1);
    }

    const data = await response.json();
    
    console.log('✅ Response received:\n');
    console.log('Answer:');
    console.log(data.answer || 'No answer provided');
    console.log('\nSources:');
    if (data.sources && data.sources.length > 0) {
      data.sources.forEach((source, i) => {
        console.log(`  ${i + 1}. ${source.title || 'Untitled'}`);
        if (source.url) console.log(`     URL: ${source.url}`);
        if (source.score) console.log(`     Score: ${source.score.toFixed(3)}`);
      });
    } else {
      console.log('  (No sources)');
    }
    
    console.log('\n✨ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. The dev server is running (pnpm dev)');
    console.log('   2. The KB has been crawled (pnpm tsx scripts/crawl-kb.ts)');
    console.log('   3. Environment variables are set');
    process.exit(1);
  }
}

testRAGAPI();













