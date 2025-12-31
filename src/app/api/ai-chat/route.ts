import { NextResponse } from 'next/server'
import { limitRequest } from '@/middleware/requestLimiter'
import { ollamaService, BOOKIJI_PROMPTS } from '@/lib/ollama'

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const limited = await limitRequest(request, { windowMs: 10_000, max: 15 })
    if (limited) return limited
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

    if (process.env.NODE_ENV === 'development') {
      console.warn('🤖 AI Chat Request:', message)
    }

    // Check if Ollama is available first
    const isAvailable = await ollamaService.isAvailable()
    if (!isAvailable) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Ollama service not available, using fallback response')
      }
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
    if (process.env.NODE_ENV === 'development') {
      console.warn(`🤖 AI Response (${responseTime}ms):`, aiResponse.substring(0, 100) + '…')
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      message: 'AI response generated successfully',
      responseTime,
      fallback: false
    })

  } catch (error) {
    const responseTime = Date.now() - startTime
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ AI Chat error:', error)
    }
    return NextResponse.json({
      success: true,
      response: "I'm here to help you book services! However, my AI assistant is temporarily unavailable. You can still browse and book services directly through our platform. What type of service are you looking for?",
      fallback: true,
      responseTime
    })
  }
} 