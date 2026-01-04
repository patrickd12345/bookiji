
import { StripeService } from '@/lib/services/stripe';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { logger } from '@/lib/logger';
import Stripe from 'stripe';

async function testWebhookFlow() {
  const supabase = createSupabaseServerClient();

  // 1. Create a mock booking in 'hold_placed' state
  logger.info('Creating mock booking...');
  const bookingId = `test_booking_${Date.now()}`;
  const customerId = `test_customer_${Date.now()}`;
  const providerId = `test_provider_${Date.now()}`;
  const paymentIntentId = `pi_test_${Date.now()}`;

  const { error: bookingError } = await supabase.from('bookings').insert({
    id: bookingId,
    customer_id: customerId,
    vendor_id: providerId, // vendor_id is the column name, provider_id is likely alias in some places or variable name
    provider_id: providerId,
    service_id: 'test_service',
    start_time: new Date(Date.now() + 86400000).toISOString(), // 24h from now
    end_time: new Date(Date.now() + 90000000).toISOString(),
    state: 'hold_placed',
    total_amount_cents: 1000,
    stripe_payment_intent_id: paymentIntentId,
    created_at: new Date().toISOString()
  });

  if (bookingError) {
    logger.error('Failed to create mock booking', bookingError);
    // Continue anyway if it's just a "relation does not exist" or similar in this environment,
    // but likely we need valid FKs.
    // In a real environment we'd need valid profiles.
    // For this test script to work in the current sandbox, we might need to rely on existing data or insert profiles.
    // Let's see if we can get away with just mocking the StripeService call and mocking dependencies if DB fails.
    // But this script runs in the actual environment.
    return;
  }

  // 2. Mock Stripe Event
  const mockEvent = {
    id: 'evt_test',
    object: 'event',
    type: 'payment_intent.succeeded',
    created: Date.now() / 1000,
    data: {
      object: {
        id: paymentIntentId,
        object: 'payment_intent',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        customer: 'cus_test',
        metadata: {
          booking_id: bookingId,
          customer_email: 'test@example.com'
        }
      } as Stripe.PaymentIntent
    }
  } as Stripe.Event;

  // 3. Call Service
  logger.info('Calling StripeService.handlePaymentSucceeded...');
  await StripeService.handlePaymentSucceeded(mockEvent);

  // 4. Verify Result
  const { data: updatedBooking } = await supabase
    .from('bookings')
    .select('state, confirmed_at')
    .eq('id', bookingId)
    .single();

  if (updatedBooking?.state === 'confirmed') {
    logger.info('SUCCESS: Booking confirmed!');
  } else {
    logger.error('FAILURE: Booking not confirmed', updatedBooking);
  }
}

testWebhookFlow().catch(console.error);
