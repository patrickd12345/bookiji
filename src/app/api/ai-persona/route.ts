import { NextResponse } from 'next/server'
import { limitRequest } from '@/middleware/requestLimiter'
import { BOOKIJI_PROMPTS } from '@/lib/ollama'
import { llmClient } from '@/lib/llm-client'

export async function POST(request: Request) {
  try {
    const limited = await limitRequest(request, { windowMs: 10_000, max: 10 })
    if (limited) return limited
    const { message, userHistory, persona, service } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ 
        error: 'Message is required and must be a string' 
    }, { status: 400 })
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn('👤 AI Persona Request:', { message, persona, service })
    }

    // Generate AI response based on customer persona using unified client
    const response = await llmClient.chat({
      messages: [
        { 
          role: 'user', 
          content: BOOKIJI_PROMPTS.personaResponse(message, persona || 'general', service, userHistory) 
        }
      ]
    })

    const aiResponse = response.choices[0]?.message?.content || ''

    if (process.env.NODE_ENV === 'development') {
      console.warn('👤 AI Persona Response:', aiResponse.substring(0, 100) + '…')
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      persona: persona || 'general',
      message: 'AI persona response generated successfully'
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ AI Persona error:', error)
    }
    return NextResponse.json({
      success: true,
      response: "I'm here to assist you, but my AI features are currently unavailable. Feel free to ask me anything about booking services!",
      fallback: true
    })
  }
}
