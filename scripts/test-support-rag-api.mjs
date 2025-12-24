#!/usr/bin/env node
/**
 * Sanity check Support RAG API endpoint
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const targetUrl = process.argv[2] || 'http://localhost:3000'

async function testSupportRAG() {
  console.log(`Testing Support RAG API at ${targetUrl}/api/support/ask\n`)
  
  try {
    const response = await fetch(`${targetUrl}/api/support/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'How do I book an appointment?' })
    })
    
    const text = await response.text()
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
    
    if (!response.ok || response.status !== 200) {
      console.error(`❌ API returned HTTP ${response.status}`)
      console.error(`Response: ${text.substring(0, 200)}`)
      process.exit(1)
    }
    
    if (!json || typeof json !== 'object') {
      console.error(`❌ Invalid response format`)
      console.error(`Response: ${text.substring(0, 200)}`)
      process.exit(1)
    }
    
    // Validate response structure
    const required = ['answerText', 'citations', 'confidence', 'fallbackUsed', 'traceId']
    const missing = required.filter(field => !(field in json))
    
    if (missing.length > 0) {
      console.error(`❌ Missing required fields: ${missing.join(', ')}`)
      process.exit(1)
    }
    
    console.log('✅ API is reachable and returns valid response')
    console.log(`   Status: ${response.status}`)
    console.log(`   Fallback used: ${json.fallbackUsed}`)
    console.log(`   Citations: ${json.citations?.length || 0}`)
    console.log(`   Confidence: ${json.confidence}`)
    console.log(`   Trace ID: ${json.traceId}`)
    
    process.exit(0)
  } catch (error) {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      console.error(`❌ API not reachable at ${targetUrl}`)
      console.error(`   Ensure the app is running with: pnpm dev`)
      process.exit(1)
    }
    console.error(`❌ Error: ${error.message}`)
    process.exit(1)
  }
}

testSupportRAG()

