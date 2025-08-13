import { NextResponse } from 'next/server'
import { ollamaService, BOOKIJI_PROMPTS } from '../../../../lib/ollama'

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const { message } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ 
        error: 'Message is required and must be a string' 
      }, { status: 400 })
    }

    if (message.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Message cannot be empty' 
      }, { status: 400 })
    }

    console.log('🤖 AI Chat Request:', message)

    // Check if Ollama is available first
    const isAvailable = await ollamaService.isAvailable()
    if (!isAvailable) {
      console.warn('⚠️ Ollama service not available, using fallback response')
      return NextResponse.json({
        success: true,
        response: "I'm here to help you book services! However, my AI assistant is temporarily unavailable. You can still browse and book services directly through our platform. What type of service are you looking for?",
        message: 'AI service unavailable, using fallback response',
        fallback: true,
        responseTime: Date.now() - startTime
      })
    }

    // Use the Bookiji booking query prompt with timeout protection
    const aiResponse = await ollamaService.generate(
      BOOKIJI_PROMPTS.bookingQuery(message)
    )

    const responseTime = Date.now() - startTime
    console.log(`🤖 AI Response (${responseTime}ms):`, aiResponse.substring(0, 100) + '…')

    return NextResponse.json({
      success: true,
      response: aiResponse,
      message: 'AI response generated successfully',
      responseTime,
      fallback: false
    })

  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('❌ AI Chat error:', error)
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to generate AI response'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'AI response took too long. Please try again or browse services directly.'
        statusCode = 408 // Request Timeout
      } else if (error.message.includes('connection')) {
        errorMessage = 'Unable to connect to AI service. You can still browse and book services directly.'
        statusCode = 503 // Service Unavailable
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      success: false,
      responseTime,
      fallback: false
    }, { status: statusCode })
  }
} 