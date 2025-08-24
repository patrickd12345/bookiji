import Stripe from 'stripe';

// Check if we have Stripe credentials, otherwise use mock mode
const isMockMode = !process.env.STRIPE_SECRET_KEY || process.env.NODE_ENV === 'development';

const stripe = isMockMode ? null : new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export interface PaymentIntentData {
  amount: number; // in cents
  currency: string;
  customer_email?: string;
  metadata: Record<string, string>;
}

export interface PaymentConfirmationResult {
  success: boolean;
  payment_intent_id: string;
  status: string;
  amount_received: number;
  customer_id?: string;
  error?: string;
}

export class StripeService {
  /**
   * Create a payment intent for the $1 commitment fee
   */
  static async createPaymentIntent(data: PaymentIntentData): Promise<Stripe.PaymentIntent> {
    if (isMockMode) {
      // Return mock payment intent for testing
      const mockIntent = {
        id: `pi_mock_${Date.now()}`,
        amount: data.amount,
        currency: data.currency || 'usd',
        status: 'requires_confirmation',
        metadata: data.metadata,
        description: 'Bookiji $1 commitment fee',
        automatic_payment_methods: {
          enabled: true,
        },
        capture_method: 'automatic',
        created: Date.now() / 1000,
        client_secret: 'pi_mock_secret',
        livemode: false,
        object: 'payment_intent',
        last_payment_error: null,
        next_action: null,
        payment_method: null,
        payment_method_options: {},
        payment_method_types: [],
        receipt_email: null,
        setup_future_usage: null,
        shipping: null,
        statement_descriptor: null,
        statement_descriptor_suffix: null,
        transfer_data: null,
        transfer_group: null,
        application: null,
        application_fee_amount: null,
        cancellation_reason: null,
        confirmation_method: 'automatic',
        customer: null,
        mandate: null,
        on_behalf_of: null,
        processing: null,
        review: null,
        source: null,
        amount_capturable: 0,
        amount_details: {
          tip: {
            amount: 0,
          },
        },
        amount_received: 0,
        balance_transaction: null,
        charge: null,
        invoice: null,
        latest_charge: null,
        payment_method_configuration_details: null,
      };
      
      return mockIntent as unknown as Stripe.PaymentIntent;
    }

    try {
      const metadata: Record<string, string> = { ...data.metadata };
      if (data.customer_email) {
        metadata.customer_email = data.customer_email;
      }

      const paymentIntent = await stripe!.paymentIntents.create({
        amount: data.amount,
        currency: data.currency || 'usd',
        metadata,
        description: 'Bookiji $1 commitment fee',
        automatic_payment_methods: {
          enabled: true,
        },
        capture_method: 'automatic',
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error(`Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Confirm a payment intent
   */
  static async confirmPayment(paymentIntentId: string): Promise<PaymentConfirmationResult> {
    if (isMockMode) {
      // Mock successful payment for testing
      if (paymentIntentId.startsWith('pi_mock_')) {
        return {
          success: true,
          payment_intent_id: paymentIntentId,
          status: 'succeeded',
          amount_received: 100, // $1.00
          customer_id: 'cus_mock_customer',
        };
      }
      
      // Mock failed payment for non-mock IDs
      return {
        success: false,
        payment_intent_id: paymentIntentId,
        status: 'failed',
        amount_received: 0,
        error: 'Mock payment failed - use pi_mock_* for success',
      };
    }

    try {
      const paymentIntent = await stripe!.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          payment_intent_id: paymentIntent.id,
          status: paymentIntent.status,
          amount_received: paymentIntent.amount_received || 0,
          customer_id: paymentIntent.customer as string,
        };
      }

      if (paymentIntent.status === 'requires_confirmation') {
        const confirmedIntent = await stripe!.paymentIntents.confirm(paymentIntentId);
        
        if (confirmedIntent.status === 'succeeded') {
          return {
            success: true,
            payment_intent_id: confirmedIntent.id,
            status: confirmedIntent.status,
            amount_received: confirmedIntent.amount_received || 0,
            customer_id: confirmedIntent.customer as string,
          };
        }
      }

      return {
        success: false,
        payment_intent_id: paymentIntent.id,
        status: paymentIntent.status,
        amount_received: 0,
        error: `Payment intent status: ${paymentIntent.status}`,
      };

    } catch (error) {
      console.error('Error confirming payment:', error);
      return {
        success: false,
        payment_intent_id: paymentIntentId,
        status: 'error',
        amount_received: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process a refund
   */
  static async processRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<Stripe.Refund> {
    if (isMockMode) {
      // Return mock refund for testing
      return {
        id: `re_mock_${Date.now()}`,
        object: 'refund',
        amount: amount || 100,
        currency: 'usd',
        created: Date.now() / 1000,
        metadata: {
          reason: reason || 'Customer request',
          processed_by: 'bookiji_system',
        },
        payment_intent: paymentIntentId,
        status: 'succeeded',
        livemode: false,
        balance_transaction: null,
        charge: null,
        description: null,
        failure_balance_transaction: null,
        failure_reason: null,
        next_attrs: null,
        receipt_number: null,
        reason: null,
        source_transfer_reversal: null,
        transfer_reversal: null,
      } as any;
    }

    try {
      const refundData: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        metadata: {
          reason: reason || 'Customer request',
          processed_by: 'bookiji_system',
        },
      };

      if (amount) {
        refundData.amount = amount;
      }

      const refund = await stripe!.refunds.create(refundData);
      return refund;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw new Error(`Failed to process refund: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): Stripe.Event {
    if (isMockMode) {
      // Return mock event for testing
      return {
        id: 'evt_mock_webhook',
        object: 'event',
        api_version: '2024-06-20',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'pi_mock_webhook',
            object: 'payment_intent',
            status: 'succeeded',
          },
        },
        livemode: false,
        pending_webhooks: 0,
        request: {
          id: 'req_mock_webhook',
          idempotency_key: null,
        },
        type: 'payment_intent.succeeded',
      } as any;
    }

    try {
      return stripe!.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw new Error('Webhook signature verification failed');
    }
  }

  /**
   * Handle payment succeeded webhook
   */
  static async handlePaymentSucceeded(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    console.log(`Payment succeeded for ${paymentIntent.id}`);
    console.log(`Amount: ${paymentIntent.amount} ${paymentIntent.currency}`);
    console.log(`Customer: ${paymentIntent.customer}`);
    console.log(`Metadata:`, paymentIntent.metadata);

    // TODO: Update booking status, send notifications, etc.
    // This would integrate with the outbox pattern
  }

  /**
   * Handle payment failed webhook
   */
  static async handlePaymentFailed(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    console.log(`Payment failed for ${paymentIntent.id}`);
    console.log(`Last payment error:`, paymentIntent.last_payment_error);

    // TODO: Update booking status, send failure notifications, etc.
  }

  /**
   * Get customer details
   */
  static async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    if (isMockMode) {
      // Return mock customer for testing
      return {
        id: customerId,
        object: 'customer',
        created: Date.now() / 1000,
        email: 'test@example.com',
        livemode: false,
        metadata: {
          source: 'bookiji_platform',
        },
      } as any;
    }

    try {
      return await stripe!.customers.retrieve(customerId) as Stripe.Customer;
    } catch (error) {
      console.error('Error retrieving customer:', error);
      return null;
    }
  }

  /**
   * Create a customer
   */
  static async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    if (isMockMode) {
      // Return mock customer for testing
      return {
        id: `cus_mock_${Date.now()}`,
        object: 'customer',
        created: Date.now() / 1000,
        email,
        name,
        livemode: false,
        metadata: {
          source: 'bookiji_platform',
        },
      } as any;
    }

    try {
      return await stripe!.customers.create({
        email,
        name,
        metadata: {
          source: 'bookiji_platform',
        },
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      throw new Error(`Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
