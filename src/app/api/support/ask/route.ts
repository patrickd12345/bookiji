import { NextResponse } from 'next/server'
import { answerSupportQuestion } from '@bookiji/ai-core/support/ask' 

export async function POST(req: Request) {
  try {
    const { question } = await req.json()
    
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question required' }, { status: 400 })
    }

    const answer = await answerSupportQuestion(question)

    return NextResponse.json(answer)
  } catch (error) {
    console.error('Support Endpoint Fatal Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
