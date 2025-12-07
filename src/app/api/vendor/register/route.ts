import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseClient'

const supabase = getServerSupabase()

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Processing vendor registration...')
    
    // Parse FormData to handle file uploads
    const formData = await request.formData()
    
    // Extract form fields
    const vendorData = {
      business_name: formData.get('business_name') as string,
      business_description: formData.get('business_description') as string,
      business_type: formData.get('business_type') as string,
      service_categories: JSON.parse(formData.get('service_categories') as string || '[]'),
      contact_name: formData.get('contact_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      website: formData.get('website') as string,
      business_address: formData.get('business_address') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zip_code: formData.get('zip_code') as string,
      service_radius: parseInt(formData.get('service_radius') as string) || 10,
      mobile_service: formData.get('mobile_service') === 'true',
      services: JSON.parse(formData.get('services') as string || '[]'),
      years_in_business: parseInt(formData.get('years_in_business') as string) || 0,
      license_number: formData.get('license_number') as string,
      insurance_verified: formData.get('insurance_verified') === 'true',
      operating_hours: JSON.parse(formData.get('operating_hours') as string || '{}'),
      advance_booking_days: parseInt(formData.get('advance_booking_days') as string) || 30,
      marketing_consent: formData.get('marketing_consent') === 'true',
      referral_source: formData.get('referral_source') as string,
    }

    // Extract uploaded images
    const businessImages: File[] = []
    for (let i = 0; i < 5; i++) {
      const image = formData.get(`business_image_${i}`) as File
      if (image && image.size > 0) {
        businessImages.push(image)
      }
    }

    console.log('📋 Vendor registration data:', {
      business_name: vendorData.business_name,
      email: vendorData.email,
      serviceCount: vendorData.services.length,
      imageCount: businessImages.length,
      categories: vendorData.service_categories.length
    })

    // Validate required fields
    const requiredFields = [
      'business_name',
      'business_description', 
      'business_type',
      'contact_name',
      'email',
      'phone',
      'business_address',
      'city',
      'state',
      'zip_code'
    ]

    const missingFields = requiredFields.filter(field => !vendorData[field as keyof typeof vendorData])
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 })
    }

    if (vendorData.service_categories.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one service category is required'
      }, { status: 400 })
    }

    if (vendorData.services.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one service offering is required'
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(vendorData.email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 })
    }

    // Generate vendor ID
    const vendorId = `vendor_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    // Process image uploads (in production, upload to cloud storage)
    const uploadedImageUrls: string[] = []
    for (const image of businessImages) {
      // For demo purposes, create mock URLs
      const mockImageUrl = `/uploads/vendors/${vendorId}/${image.name}`
      uploadedImageUrls.push(mockImageUrl)
      console.log(`📸 Mock image upload: ${image.name} (${image.size} bytes)`)
    }

    // Create comprehensive vendor profile
    const vendorProfile = {
      id: vendorId,
      ...vendorData,
      business_images: uploadedImageUrls,
      verification_status: 'pending_verification',
      approval_status: 'pending_approval',
      onboarding_completed: true,
      profile_completed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Calculated fields
      is_verified: false,
      is_approved: false,
      is_active: false,
      average_rating: 0,
      total_reviews: 0,
      total_bookings: 0,
      
      // Default settings
      auto_accept_bookings: false,
      cancellation_policy: 'flexible',
      payment_methods: ['credit_card', 'credits'],
      notification_preferences: {
        email_booking_requests: true,
        email_booking_confirmations: true,
        email_cancellations: true,
        email_reviews: true,
        sms_booking_requests: true,
        sms_booking_confirmations: false
      }
    }

    // Persist vendor profile
    await supabase.from('profiles').insert({
      id: vendorId,
      full_name: vendorData.contact_name,
      email: vendorData.email,
      phone: vendorData.phone,
      role: 'vendor',
      marketing_consent: vendorData.marketing_consent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Send verification email (mock)
    console.log('📧 Mock verification email sent to:', vendorData.email)

    // Log for admin notification
    console.log('👔 Mock admin notification - new vendor registration pending approval')

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Vendor registration completed successfully',
      vendor: {
        id: vendorId,
        business_name: vendorProfile.business_name,
        email: vendorProfile.email,
        verification_status: vendorProfile.verification_status,
        approval_status: vendorProfile.approval_status
      },
      next_steps: [
        'Email verification required',
        'Business documents review (1-2 business days)',
        'Profile approval notification',
        'Access to vendor dashboard'
      ],
      estimated_approval_time: '24-48 hours'
    })

  } catch (error) {
    console.error('❌ Vendor registration error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
      details: 'Please check all required fields and try again'
    }, { status: 500 })
  }
} 