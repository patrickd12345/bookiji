// Test data for development
export const testData = {
  users: [
    {
      id: 'test-user-1',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'customer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  services: [
    {
      id: 'test-service-1',
      vendor_id: 'test-vendor-1',
      name: 'Test Service',
      description: 'A test service',
      duration_minutes: 60,
      price_cents: 5000,
      category: 'test',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  bookings: [
    {
      id: 'test-booking-1',
      customer_id: 'test-user-1',
      vendor_id: 'test-vendor-1',
      service_id: 'test-service-1',
      slot_id: 'test-slot-1',
      slot_start: new Date().toISOString(),
      slot_end: new Date(Date.now() + 3600000).toISOString(),
      status: 'pending',
      commitment_fee_paid: false,
      vendor_fee_paid: false,
      total_amount_cents: 5000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  credits: {
    balance_cents: 10000,
    balance_dollars: 100
  }
} 