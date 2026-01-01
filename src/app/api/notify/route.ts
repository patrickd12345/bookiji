import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const {
      SMTP_HOST = 'smtp.gmail.com',
      SMTP_PORT = '465',
      SMTP_USER,
      SMTP_PASS,
    } = process.env

    if (!SMTP_USER || !SMTP_PASS) {
      console.error('SMTP credentials missing')
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })

    await transporter.sendMail({
      from: `Bookiji <${SMTP_USER}>`,
      to: 'Pilotmontreal@gmail.com',
      subject: 'New Bookiji waiting list signup',
      text: `New subscriber: ${email}`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 