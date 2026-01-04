
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StripeService } from '@/lib/services/stripe';
import * as Logger from '@/lib/logger';
import * as PaymentsRepo from '@/lib/payments/repository';
import * as EmailUtils from '@/utils/sendEmail';
import * as InvariantAssertions from '@/lib/guards/invariantAssertions';

// Mock dependencies
const mockSupabase = {
  from: vi.fn(),
};

// Mock supabaseProxies
// Using a factory function that returns the mock directly to avoid hoisting issues
vi.mock('@/lib/supabaseProxies', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  errorToContext: (err: unknown) => ({ error: err }),
}));

// Mock repositories and utils
vi.mock('@/lib/payments/repository', () => ({
  findByExternalId: vi.fn(),
  updateStatus: vi.fn(),
}));

vi.mock('@/utils/sendEmail', () => ({
  sendBookingConfirmation: vi.fn(),
}));

vi.mock('@/lib/guards/invariantAssertions', () => ({
  assertValidBookingStateTransition: vi.fn(),
  assertSlotReleasedOnCancellation: vi.fn(),
}));

// We need to access the mock from the module after mocking
import { supabaseAdmin } from '@/lib/supabaseProxies';

describe('StripeService.handlePaymentSucceeded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully confirm booking and send email when payment succeeds', async () => {
    // Setup Mocks
    const mockEvent = {
      data: {
        object: {
          id: 'pi_123',
          amount: 1000,
          currency: 'usd',
          status: 'succeeded',
          customer: 'cus_123',
          metadata: {
            booking_id: 'booking_123',
            customer_email: 'test@example.com',
          },
        },
      },
    } as any;

    const mockDbPaymentIntent = {
      id: 'db_pi_123',
      credit_intent_id: 'ci_123',
    };

    const mockBooking = {
      id: 'booking_123',
      state: 'hold_placed',
      provider_id: 'provider_123',
      service_id: 'service_123',
      customer_id: 'customer_123',
      start_time: new Date().toISOString(),
    };

    const mockProfile = { id: 'customer_123', full_name: 'Test User' };
    const mockVendor = { id: 'provider_123', business_name: 'Test Vendor' };
    const mockService = { id: 'service_123', title: 'Test Service' };

    // Repo Mocks
    (PaymentsRepo.findByExternalId as any).mockResolvedValue(mockDbPaymentIntent);
    (PaymentsRepo.updateStatus as any).mockResolvedValue({ success: true });

    // Supabase Chain Mocks
    const updateBookingMock = vi.fn().mockResolvedValue({ error: null });
    const updateOutboxMock = vi.fn().mockResolvedValue({ error: null });
    const insertAuditMock = vi.fn().mockResolvedValue({ error: null });

    // Mock `from` calls
    // Casting to any to access the mock method
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === 'bookings') {
        return {
          select: () => ({
            eq: (col: string, val: string) => {
               // Handle first lookup by ID (metadata)
               if (col === 'id' && val === 'booking_123') return { eq: () => ({ single: () => Promise.resolve({ data: mockBooking, error: null }) }) };
               // Handle fallback lookup by payment intent
               if (col === 'stripe_payment_intent_id') return { eq: () => ({ single: () => Promise.resolve({ data: mockBooking, error: null }) }) };
               return { single: () => Promise.resolve({ data: null, error: 'Not found' }) };
            }
          }),
          update: () => ({
            eq: () => ({ eq: updateBookingMock })
          })
        };
      }
      if (table === 'payments_outbox') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) // No existing outbox
          }),
          update: () => ({
            eq: () => ({ eq: updateOutboxMock })
          })
        };
      }
      if (table === 'booking_audit_log') {
        return {
          insert: insertAuditMock
        };
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: (col: string, val: string) => {
              if (val === 'customer_123') return { single: () => Promise.resolve({ data: mockProfile }) };
              if (val === 'provider_123') return { single: () => Promise.resolve({ data: mockVendor }) };
              return { single: () => Promise.resolve({ data: null }) };
            }
          })
        };
      }
      if (table === 'services') {
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: mockService }) })
          })
        };
      }
      if (table === 'subscription_plans') {
          return {
              select: () => ({
                  or: () => ({ single: () => Promise.resolve({ data: null }) })
              })
          };
      }
      if (table === 'vendor_subscriptions') {
          return {
            select: () => ({
                eq: () => ({ single: () => Promise.resolve({ data: null }) })
            }),
             upsert: () => Promise.resolve({ error: null }),
             update: () => ({ eq: () => Promise.resolve({ error: null }) })
          };
      }
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) };
    });

    // Run
    await StripeService.handlePaymentSucceeded(mockEvent);

    // Verify
    expect(PaymentsRepo.findByExternalId).toHaveBeenCalledWith('stripe', 'pi_123');
    expect(PaymentsRepo.updateStatus).toHaveBeenCalledWith('db_pi_123', 'captured', expect.any(Object));
    expect(InvariantAssertions.assertValidBookingStateTransition).toHaveBeenCalledWith(supabaseAdmin, 'booking_123', 'hold_placed', 'confirmed');

    // Verify Booking Update
    expect(updateBookingMock).toHaveBeenCalled();

    // Verify Outbox Update
    expect(updateOutboxMock).toHaveBeenCalled();

    // Verify Email Sent
    expect(EmailUtils.sendBookingConfirmation).toHaveBeenCalledWith(expect.objectContaining({
      customerEmail: 'test@example.com',
      customerName: 'Test User',
      vendorName: 'Test Vendor',
      serviceName: 'Test Service',
      bookingId: 'booking_123'
    }));

    // Verify Logs
    expect(Logger.logger.info).toHaveBeenCalledWith('Booking confirmation email sent', expect.any(Object));
  });

  it('should handle missing booking gracefully', async () => {
    const mockEvent = {
      data: { object: { id: 'pi_unknown', metadata: {} } },
    } as any;

    (PaymentsRepo.findByExternalId as any).mockResolvedValue({ id: 'db_pi_unknown', credit_intent_id: 'ci_123' });
    (PaymentsRepo.updateStatus as any).mockResolvedValue({ success: true });

    (supabaseAdmin.from as any).mockImplementation(() => ({
      select: () => ({
        eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Not found' } }) }) })
      })
    }));

    await StripeService.handlePaymentSucceeded(mockEvent);

    expect(Logger.logger.error).toHaveBeenCalledWith('Booking not found for payment intent:', expect.any(Object));
  });
});
