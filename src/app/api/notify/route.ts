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
    console.error('Failed to send notification email:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 