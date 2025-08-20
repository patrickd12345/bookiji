import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from './mailer'
import { generateBookingConfirmationEmail } from './emailTemplates'

interface BookingRequest {
  vendorId: string
  serviceId: string
  slotId: string
  slotStart: string
  slotEnd: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  paymentMethod: 'credits' | 'card'
  totalAmountCents: number
  notes?: string
}

// Accepts dependencies as an argument for future extensibility (e.g., database, email, etc.)
export function makeBookingsCreateHandler() {
  return async function POST(request: NextRequest) {
    try {
      const bookingData: BookingRequest = await request.json()
      
      // Validate required fields
      const requiredFields = [
        'vendorId', 'serviceId', 'slotStart', 'slotEnd', 
        'customerName', 'customerEmail', 'paymentMethod', 'totalAmountCents'
      ]

      const missingFields = requiredFields.filter(field => !bookingData[field as keyof BookingRequest])
      
      if (missingFields.length > 0) {
        return NextResponse.json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        }, { status: 400 })
      }

      // Generate booking ID
      const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      const customerId = `customer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

      // Create booking record
      const booking = {
        id: bookingId,
        customer_id: customerId,
        vendor_id: bookingData.vendorId,
        service_id: bookingData.serviceId,
        slot_start: bookingData.slotStart,
        slot_end: bookingData.slotEnd,
        status: 'confirmed',
        payment_method: bookingData.paymentMethod,
        total_amount_cents: bookingData.totalAmountCents,
        created_at: new Date().toISOString()
      }

      const customer = {
        id: customerId,
        email: bookingData.customerEmail,
        full_name: bookingData.customerName,
        phone: bookingData.customerPhone || null
      }

      // Send confirmation email
      try {
        const emailHtml = generateBookingConfirmationEmail({
          customerName: bookingData.customerName,
          vendorName: 'Your Service Provider', // TODO: Fetch actual vendor name from database
          serviceName: 'Service', // TODO: Fetch actual service name from database
          slotStart: bookingData.slotStart,
          slotEnd: bookingData.slotEnd,
          totalAmount: `$${(bookingData.totalAmountCents / 100).toFixed(2)}`,
          bookingId: bookingId,
          notes: bookingData.notes
        });

        await sendEmail({
          to: bookingData.customerEmail,
          subject: 'Booking Confirmation - Bookiji',
          html: emailHtml
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the booking creation if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Booking created successfully',
        booking,
        customer,
        next_steps: ['Booking confirmed', 'Check your email for details']
      })

    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Booking creation failed'
      }, { status: 500 })
    }
  }
} 