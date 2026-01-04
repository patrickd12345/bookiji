// @env-allow-legacy-dotenv
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local first, then .env as fallback
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function testRAG() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${baseUrl}/api/support/ask`;
  
  console.log(`Testing RAG API at: ${url}`);
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'What is Bookiji?' })
    });
    
    const data = await res.json();
    console.log('\n✅ Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (res.ok && data.answer) {
      console.log('\n✅ RAG API is working!');
      if (data.sources && data.sources.length > 0) {
        console.log(`📚 Found ${data.sources.length} source(s)`);
      }
    } else {
      console.log('\n⚠️ RAG API returned an error');
    }
  } catch (error) {
    console.error('\n❌ Error testing RAG API:', error);
    console.log('\n💡 Make sure the dev server is running: pnpm dev');
  }
}

testRAG();



