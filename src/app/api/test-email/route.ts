import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mailer';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html } = await request.json();
    
    if (!to || !subject || !html) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: to, subject, html'
      }, { status: 400 });
    }

    const result = await sendEmail({ to, subject, html });
    
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId
    });
    
  } catch (error) {
    console.error('Email sending failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Email sending failed'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test email endpoint. Use POST with { to, subject, html } to send a test email.'
  });
}
