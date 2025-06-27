import { NextResponse } from 'next/server'
import { ollamaService, BOOKIJI_PROMPTS } from '../../../../lib/ollama'

export async function GET() {
  try {
    console.log('🧠 Testing Bookiji AI Integration...')
    
    // Test 1: Check if Ollama is available
    console.log('1️⃣ Checking Ollama availability...')
    const isAvailable = await ollamaService.isAvailable()
    console.log(`   Ollama available: ${isAvailable}`)
    
    if (!isAvailable) {
      return NextResponse.json({ 
        error: 'Ollama is not running. Please start it with: ollama serve' 
      }, { status: 500 })
    }
    
    // Test 2: Get available models
    console.log('2️⃣ Checking available models...')
    const models = await ollamaService.getAvailableModels()
    console.log(`   Available models: ${models.join(', ')}`)
    
    // Test 3: Test booking query
    console.log('3️⃣ Testing booking query...')
    const bookingResponse = await ollamaService.generate(
      BOOKIJI_PROMPTS.bookingQuery("I need a haircut tomorrow")
    )
    console.log(`   Booking response: ${bookingResponse.substring(0, 100)}...`)
    
    // Test 4: Test radius scaling
    console.log('4️⃣ Testing radius scaling...')
    const radiusResponse = await ollamaService.generate(
      BOOKIJI_PROMPTS.radiusScaling('dense', 'haircut')
    )
    console.log(`   Radius response: ${radiusResponse.substring(0, 100)}...`)
    
    console.log('🎉 All tests passed! Bookiji AI is ready to go!')
    
    return NextResponse.json({
      success: true,
      ollamaAvailable: isAvailable,
      models,
      bookingResponse: bookingResponse.substring(0, 200) + '...',
      radiusResponse: radiusResponse.substring(0, 200) + '...',
      message: 'All tests passed! Bookiji AI is ready to go!'
    })
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
} 