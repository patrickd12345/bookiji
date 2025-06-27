import { NextResponse } from 'next/server'
import { ollamaService, BOOKIJI_PROMPTS } from '../../../../lib/ollama'

export async function POST(request: Request) {
  try {
    const { message } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ 
        error: 'Message is required and must be a string' 
      }, { status: 400 })
    }

    console.log('🤖 AI Chat Request:', message)

    // Use the Bookiji booking query prompt
    const aiResponse = await ollamaService.generate(
      BOOKIJI_PROMPTS.bookingQuery(message)
    )

    console.log('🤖 AI Response:', aiResponse.substring(0, 100) + '...')

    return NextResponse.json({
      success: true,
      response: aiResponse,
      message: 'AI response generated successfully'
    })

  } catch (error) {
    console.error('❌ AI Chat error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate AI response',
      success: false
    }, { status: 500 })
  }
} 