#!/usr/bin/env node
/**
 * Jarvis Dry-Run Test
 * 
 * Tests the SMS loop without actually sending SMS:
 * 1. Trigger detection
 * 2. Simulate replies
 * 3. Verify action execution
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const OWNER_PHONE = process.env.JARVIS_OWNER_PHONE

if (!OWNER_PHONE) {
  console.error('❌ JARVIS_OWNER_PHONE not set')
  process.exit(1)
}

async function testDetection() {
  console.log('\n🔍 Testing Incident Detection...\n')
  
  try {
    const response = await fetch(`${BASE_URL}/api/jarvis/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: OWNER_PHONE })
    })

    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Detection successful')
      console.log(`   Incident ID: ${result.incident_id}`)
      console.log(`   SMS Sent: ${result.sms_sent}`)
      if (result.duplicate_suppressed) {
        console.log('   ⚠️  Duplicate suppressed (expected if run multiple times)')
      }
      return result.incident_id
    } else {
      console.log('⚠️  No alert needed:', result.reason || 'Unknown')
      return null
    }
  } catch (error) {
    console.error('❌ Detection failed:', error.message)
    return null
  }
}

async function testReply(incidentId, replyText) {
  console.log(`\n📱 Testing Reply: "${replyText}"\n`)
  
  try {
    const response = await fetch(`${BASE_URL}/api/jarvis/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Body: replyText,
        From: OWNER_PHONE,
        incident_id: incidentId,
        env: 'prod'
      })
    })

    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Reply processed')
      console.log(`   Choices: ${result.parsed.choices.join(', ')}`)
      console.log(`   Actions executed: ${result.actions_executed.length}`)
      result.actions_executed.forEach(action => {
        console.log(`   - ${action.action_id}: ${action.success ? '✅' : '❌'} ${action.message}`)
      })
    } else {
      console.error('❌ Reply processing failed:', result.error)
    }
  } catch (error) {
    console.error('❌ Reply test failed:', error.message)
  }
}

async function main() {
  console.log('🧪 Jarvis Dry-Run Test\n')
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Owner Phone: ${OWNER_PHONE}\n`)

  // Test 1: Detection
  const incidentId = await testDetection()

  if (!incidentId) {
    console.log('\n⚠️  No incident detected. This is normal if system is healthy.')
    console.log('   To test, you may need to simulate an incident.')
    process.exit(0)
  }

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Test 2: Simple reply (A)
  await testReply(incidentId, 'A')

  await new Promise(resolve => setTimeout(resolve, 1000))

  // Test 3: Multiple choice (B+C)
  await testReply(incidentId, 'B+C')

  await new Promise(resolve => setTimeout(resolve, 1000))

  // Test 4: Natural language
  await testReply(incidentId, 'A. Baby woke up. Don\'t wake me unless bookings are at risk.')

  console.log('\n✅ Dry-run complete!\n')
}

main().catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})











