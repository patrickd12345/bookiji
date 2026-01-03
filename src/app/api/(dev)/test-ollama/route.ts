import { NextResponse } from 'next/server'
import { BOOKIJI_PROMPTS } from '@/lib/ollama'
import { llmClient } from '@/lib/llm-client'

export async function GET() {
  try {
    console.warn('🧠 Testing Bookiji LLM Integration')
    
    // Test 1: Check if LLM is available
    console.warn('1️⃣ Checking LLM availability')
    const isAvailable = await llmClient.healthCheck()
    console.warn(`   LLM available: ${isAvailable}`)
    
    if (!isAvailable) {
      return NextResponse.json({ 
        error: 'LLM service is not available. Please check your configuration.' 
    }, { status: 500 })
    }
    
    // Test 2: Get available models
    console.warn('2️⃣ Checking available models')
    const models = await llmClient.getAvailableModels()
    console.warn(`   Available models: ${models.join(', ')}`)
    
    // Test 3: Test booking query
    console.warn('3️⃣ Testing booking query')
    const bookingResponseData = await llmClient.chat({
      messages: [
        { role: 'user', content: BOOKIJI_PROMPTS.bookingQuery("I need a haircut tomorrow") }
      ]
    })
    const bookingResponse = bookingResponseData.choices[0]?.message?.content || ''
    console.warn(`   Booking response: ${bookingResponse.substring(0, 100)}…`)
    
    // Test 4: Test radius scaling
    console.warn('4️⃣ Testing radius scaling')
    const radiusResponseData = await llmClient.chat({
      messages: [
        { role: 'user', content: BOOKIJI_PROMPTS.radiusScaling('dense', 'haircut') }
      ]
    })
    const radiusResponse = radiusResponseData.choices[0]?.message?.content || ''
    console.warn(`   Radius response: ${radiusResponse.substring(0, 100)}…`)
    
    console.warn('🎉 All tests passed! Bookiji LLM is ready to go!')
    
    return NextResponse.json({
      success: true,
      llmAvailable: isAvailable,
      models,
      bookingResponse: bookingResponse.substring(0, 200) + '…',
      radiusResponse: radiusResponse.substring(0, 200) + '…',
      message: 'All tests passed! Bookiji LLM is ready to go!'
    })
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
}
