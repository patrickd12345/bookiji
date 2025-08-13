import { NextResponse } from 'next/server'
import { ollamaService, BOOKIJI_PROMPTS } from '../../../../lib/ollama'

export async function POST(request: Request) {
  try {
    const { message, userHistory, persona, service } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ 
        error: 'Message is required and must be a string' 
      }, { status: 400 })
    }

    console.log('👤 AI Persona Request:', { message, persona, service })

    // Generate AI response based on customer persona
    const aiResponse = await ollamaService.generate(
      BOOKIJI_PROMPTS.personaResponse(message, persona || 'general', service, userHistory)
    )

    console.log('👤 AI Persona Response:', aiResponse.substring(0, 100) + '…')

    return NextResponse.json({
      success: true,
      response: aiResponse,
      persona: persona || 'general',
      message: 'AI persona response generated successfully'
    })

  } catch (error) {
    console.error('❌ AI Persona error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate AI persona response',
      success: false
    }, { status: 500 })
  }
} 