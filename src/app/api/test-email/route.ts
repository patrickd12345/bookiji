import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, sendBookingConfirmation, sendPasswordReset } from '@/utils/sendEmail';

export async function POST(request: NextRequest) {
  try {
    const { type, ...data } = await request.json();
    
    let result;
    
    switch (type) {
      case 'booking_confirmation':
        result = await sendBookingConfirmation({
          customerEmail: data.customerEmail,
          customerName: data.customerName || 'Test Customer',
          vendorName: data.vendorName || 'Test Vendor',
          serviceName: data.serviceName || 'Test Service',
          bookingDate: data.bookingDate || '2025-08-22',
          bookingTime: data.bookingTime || '14:00',
          bookingId: data.bookingId || 'TEST-123',
        });
        break;
        
      case 'password_reset':
        result = await sendPasswordReset({
          userEmail: data.userEmail,
          userName: data.userName || 'Test User',
          resetLink: data.resetLink || 'https://bookiji.com/reset?token=test',
        });
        break;
        
      case 'custom':
      default:
        if (!data.to || !data.subject || !data.html) {
          return NextResponse.json({ 
            success: false, 
            error: 'Missing required fields: to, subject, html' 
          }, { status: 400 });
        }
        result = await sendEmail({ 
          to: data.to, 
          subject: data.subject, 
          html: data.html 
        });
        break;
    }
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Email sent successfully', 
        messageId: result.messageId 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Email sending failed' 
      }, { status: 500 });
    }
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
    message: 'Test email endpoint. Use POST with different email types:',
    examples: {
      'booking_confirmation': {
        type: 'booking_confirmation',
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        vendorName: 'Spa Lotus',
        serviceName: 'Massage 60min',
        bookingDate: '2025-08-22',
        bookingTime: '14:00',
        bookingId: 'BKJ-12345'
      },
      'password_reset': {
        type: 'password_reset',
        userEmail: 'user@example.com',
        userName: 'Jane Smith',
        resetLink: 'http://localhost:3000/auth/reset?token=test123'
      },
      'custom': {
        type: 'custom',
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test</h1><p>This is a test email.</p>'
      }
    }
  });
}
