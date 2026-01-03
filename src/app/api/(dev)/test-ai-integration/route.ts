import { NextResponse } from 'next/server'
import { llmClient } from '@/lib/llm-client'

export async function GET() {
  const testResults = {
    timestamp: new Date().toISOString(),
    llmConnection: false,
    aiChat: false,
    aiRadiusScaling: false,
    aiPersona: false,
    responseTimes: {} as Record<string, number>,
    errors: [] as string[]
  }

  try {
    // Test 1: LLM Connection
    console.warn('🧪 Testing LLM connection...')
    const startTime = Date.now()
    const isAvailable = await llmClient.healthCheck()
    testResults.llmConnection = isAvailable
    testResults.responseTimes.llmConnection = Date.now() - startTime
    
    if (!isAvailable) {
      testResults.errors.push('LLM service not available')
      return NextResponse.json(testResults, { status: 503 })
    }

    // Test 2: AI Chat
    console.warn('🧪 Testing AI Chat...')
    const chatStart = Date.now()
    try {
      const response = await llmClient.chat({
        messages: [{ role: 'user', content: 'Test booking query: I need a hair appointment' }]
      })
      const chatResponse = response.choices[0]?.message?.content || ''
      testResults.aiChat = chatResponse.length > 0
      testResults.responseTimes.aiChat = Date.now() - chatStart
    } catch (error) {
      testResults.errors.push(`AI Chat failed: ${error}`)
    }

    // Test 3: AI Radius Scaling
    console.warn('🧪 Testing AI Radius Scaling...')
    const radiusStart = Date.now()
    try {
      const response = await llmClient.chat({
        messages: [{ role: 'user', content: 'You are Bookiji\'s AI radius scaling system. Analyze the optimal search radius for hair appointment in a dense provider area. Consider service type, provider density, travel convenience, and privacy protection. For hair appointment in a dense area, recommend the optimal radius in kilometers. Respond with: "Recommended radius: X km" followed by a brief explanation of your reasoning. Keep the explanation under 50 words.' }]
      })
      const radiusResponse = response.choices[0]?.message?.content || ''
      testResults.aiRadiusScaling = radiusResponse.includes('Recommended radius:') || radiusResponse.includes('km')
      testResults.responseTimes.aiRadiusScaling = Date.now() - radiusStart
    } catch (error) {
      testResults.errors.push(`AI Radius Scaling failed: ${error}`)
    }

    // Test 4: AI Persona
    console.warn('🧪 Testing AI Persona...')
    const personaStart = Date.now()
    try {
      const response = await llmClient.chat({
        messages: [{ role: 'user', content: 'You are Bookiji\'s AI assistant, adapting to customer persona: busy-professional. Customer message: "I need a service today" Adapt your response based on the persona: busy-professional: Concise, time-focused, premium suggestions, emphasize convenience. Keep responses under 100 words and maintain the persona\'s communication style.' }]
      })
      const personaResponse = response.choices[0]?.message?.content || ''
      testResults.aiPersona = personaResponse.length > 0
      testResults.responseTimes.aiPersona = Date.now() - personaStart
    } catch (error) {
      testResults.errors.push(`AI Persona failed: ${error}`)
    }

    // Calculate overall success
    const successCount = Object.values({
      llmConnection: testResults.llmConnection,
      aiChat: testResults.aiChat,
      aiRadiusScaling: testResults.aiRadiusScaling,
      aiPersona: testResults.aiPersona
    }).filter(Boolean).length

    const overallSuccess = successCount >= 3 // At least 3 out of 4 tests must pass

    console.warn('🧪 AI Integration Test Results:', {
      success: overallSuccess,
      testsPassed: successCount,
      totalTests: 4,
      responseTimes: testResults.responseTimes,
      errors: testResults.errors
    })

    return NextResponse.json({
      success: overallSuccess,
      testsPassed: successCount,
      totalTests: 4,
      ...testResults
    })

  } catch (error) {
    console.error('❌ AI Integration test failed:', error)
    testResults.errors.push(`Integration test failed: ${error}`)
    return NextResponse.json(testResults, { status: 500 })
  }
}
