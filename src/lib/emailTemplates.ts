export interface BookingConfirmationData {
  customerName: string;
  vendorName: string;
  serviceName: string;
  slotStart: string;
  slotEnd: string;
  bookingId: string;
  vendorAddress?: string;
  expectations?: string;
  notes?: string;
}

export function generateBookingConfirmationEmail(data: BookingConfirmationData): string {
  const formattedStart = new Date(data.slotStart).toLocaleString();
  const formattedEnd = new Date(data.slotEnd).toLocaleString();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Booking Confirmed!</h1>
      <p>Your appointment has been successfully scheduled</p>
    </div>
    
    <div class="content">
      <h2>Hello ${data.customerName},</h2>
      
      <p>Great news! Your booking has been confirmed. Here are the details:</p>
      
      <div class="booking-details">
        <h3>📅 Appointment Details</h3>
        <p><strong>Service:</strong> ${data.serviceName}</p>
        <p><strong>Provider:</strong> ${data.vendorName}</p>
        <p><strong>Date & Time:</strong> ${formattedStart} - ${formattedEnd}</p>
        <p><strong>Booking ID:</strong> ${data.bookingId}</p>
        ${data.vendorAddress ? `<p><strong>Location:</strong> ${data.vendorAddress}</p>` : ''}
        ${data.expectations ? `<p><strong>Expectations:</strong> ${data.expectations}</p>` : ''}
        ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
      </div>
      
      <p>Please arrive a few minutes before your scheduled time. If you need to make any changes or have questions, please contact us.</p>
      
      <div style="text-align: center;">
        <a href="#" class="button">View Booking Details</a>
      </div>
      
      <p>Thank you for choosing Bookiji!</p>
    </div>
    
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>&copy; 2024 Bookiji. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateSimpleEmailTemplate(subject: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${subject}</h1>
    </div>
    
    <div class="content">
      ${content}
    </div>
    
    <div class="footer">
      <p>&copy; 2024 Bookiji. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
