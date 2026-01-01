import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    await sendEmail({
      to: 'Pilotmontreal@gmail.com',
      subject: 'New Bookiji waiting list signup',
      html: `<p>New subscriber: <strong>${email}</strong></p>`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Email send error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    
    // Provide helpful error message for Gmail authentication issues
    if (errorMessage.includes('535') || errorMessage.includes('BadCredentials') || errorMessage.includes('EAUTH')) {
      return NextResponse.json({ 
        error: 'Email authentication failed. If using Gmail, ensure you are using an App Password (not your regular password). See: https://support.google.com/accounts/answer/185833',
        details: errorMessage
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 })
  }
} 