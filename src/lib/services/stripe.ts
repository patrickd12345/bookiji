import Stripe from 'stripe';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { logger, errorToContext } from '@/lib/logger';

let _stripe: Stripe | null = null;
let _isMockMode: boolean | null = null;

function getIsMockMode(): boolean {
  if (_isMockMode === null) {
    _isMockMode = !process.env.STRIPE_SECRET_KEY || process.env.NODE_ENV === 'development';
  }
  return _isMockMode;
}

function getStripe(): Stripe | null {
  if (getIsMockMode()) {
    return null;
  }
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      // Should technically be covered by isMockMode check, but for type safety
      logger.warn('STRIPE_SECRET_KEY missing despite not being in mock mode. Defaulting to mock.');
      _isMockMode = true;
      return null;
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: '2024-06-20',
    });
  }
  return _stripe;
}

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
    if (getIsMockMode()) {
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
        payment_method_configuration_details_options: null,
      };
      
      return mockIntent as unknown as Stripe.PaymentIntent;
    }

    try {
      const metadata: Record<string, string> = { ...data.metadata };
      if (data.customer_email) {
        metadata.customer_email = data.customer_email;
      }

      const stripe = getStripe();
      if (!stripe) throw new Error('Stripe client not initialized');

      const paymentIntent = await stripe.paymentIntents.create({
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
      logger.error('Error creating payment intent', errorToContext(error));
      throw new Error(`Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Confirm a payment intent
   */
  static async confirmPayment(paymentIntentId: string): Promise<PaymentConfirmationResult> {
    if (getIsMockMode()) {
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
      const stripe = getStripe();
      if (!stripe) throw new Error('Stripe client not initialized');

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
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
        const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntentId);
        
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
      logger.error('Error confirming payment', errorToContext(error));
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
    if (getIsMockMode()) {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      const stripe = getStripe();
      if (!stripe) throw new Error('Stripe client not initialized');

      const refund = await stripe.refunds.create(refundData);
      return refund;
    } catch (error) {
      logger.error('Error processing refund', errorToContext(error));
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
    if (getIsMockMode()) {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    }

    try {
      const stripe = getStripe();
      if (!stripe) throw new Error('Stripe client not initialized');
      return stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      logger.error('Webhook signature verification failed', errorToContext(error));
      throw new Error('Webhook signature verification failed');
    }
  }

  /**
   * Handle payment succeeded webhook
   */
  static async handlePaymentSucceeded(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    logger.info('Payment succeeded', { payment_intent_id: paymentIntent.id, amount: paymentIntent.amount, currency: paymentIntent.currency, customer: paymentIntent.customer, metadata: paymentIntent.metadata });

    // TODO: Update booking status, send notifications, etc.
    // This would integrate with the outbox pattern
  }

  /**
   * Handle payment failed webhook
   */
  static async handlePaymentFailed(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    logger.warn('Payment failed', { payment_intent_id: paymentIntent.id, last_payment_error: paymentIntent.last_payment_error });

    // TODO: Update booking status, send failure notifications, etc.
  }

  /**
   * Get customer details
   */
  static async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    if (getIsMockMode()) {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    }

    try {
      const stripe = getStripe();
      if (!stripe) throw new Error('Stripe client not initialized');
      return await stripe.customers.retrieve(customerId) as Stripe.Customer;
    } catch (error) {
      logger.error('Error retrieving customer', { ...errorToContext(error), customer_id: customerId });
      return null;
    }
  }

  /**
   * Create a customer
   */
  static async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    if (getIsMockMode()) {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    }

    try {
      const stripe = getStripe();
      if (!stripe) throw new Error('Stripe client not initialized');
      return await stripe.customers.create({
        email,
        name,
        metadata: {
          source: 'bookiji_platform',
        },
      });
    } catch (error) {
      logger.error('Error creating customer', { ...errorToContext(error), email, name });
      throw new Error(`Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a checkout session for subscription
   */
  static async createSubscriptionCheckoutSession(
    priceId: string,
    providerId: string,
    email: string,
    successUrl: string,
    cancelUrl: string,
    customerId?: string
  ): Promise<string | null> {
    if (getIsMockMode()) {
       return `https://mock.checkout.session/${priceId}`;
    }
    const stripe = getStripe();
    if (!stripe) throw new Error('Stripe client not initialized');

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: providerId,
      customer_email: customerId ? undefined : email,
      customer: customerId,
      metadata: {
          providerId,
      }
    };

    const session = await stripe.checkout.sessions.create(params);
    return session.url;
  }

  /**
   * Create a billing portal session
   */
  static async createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<string | null> {
    if (getIsMockMode()) {
        return `https://mock.billing.portal/${customerId}`;
    }
    const stripe = getStripe();
    if (!stripe) throw new Error('Stripe client not initialized');

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session.url;
  }

  /**
   * Handle checkout session completed
   */
  static async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
      const providerId = session.client_reference_id;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      
      if (!providerId || !customerId || !subscriptionId) {
          logger.error('Missing data in checkout session', { providerId, customerId, subscriptionId });
          return;
      }

      const supabase = createSupabaseServerClient();
      
      // Get subscription details to get status and current_period_end
      let status = 'active';
      let currentPeriodEnd = new Date().toISOString();
      let planId = '';

      const stripe = getStripe();
      if (stripe) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          status = sub.status;
          currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
          planId = sub.items.data[0]?.price.id;
      }

      // Get plan details
      let planType = 'free'
      let billingCycle = 'monthly'
      let trialStart = null
      let trialEnd = null
      
      if (stripe) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId)
          status = sub.status
          currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString()
          planId = sub.items.data[0]?.price.id
          trialStart = sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null
          trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null
          
          // Try to determine plan type
          if (planId) {
            const { data: plan } = await supabase
              .from('subscription_plans')
              .select('plan_type, billing_cycle')
              .or(`stripe_price_id_monthly.eq.${planId},stripe_price_id_annual.eq.${planId}`)
              .single()
            
            if (plan) {
              planType = plan.plan_type
              billingCycle = plan.billing_cycle
            }
          }
      }

      await supabase.from('vendor_subscriptions').upsert({
          provider_id: providerId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: status,
          current_period_start: stripe ? new Date((await stripe.subscriptions.retrieve(subscriptionId)).current_period_start * 1000).toISOString() : new Date().toISOString(),
          current_period_end: currentPeriodEnd,
          plan_id: planId,
          plan_type: planType,
          billing_cycle: billingCycle,
          trial_start: trialStart,
          trial_end: trialEnd,
          updated_at: new Date().toISOString()
      }, { onConflict: 'provider_id' });
  }

  /**
   * Handle subscription updated/deleted
   */
  static async handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
      const supabase = createSupabaseServerClient();
      const customerId = subscription.customer as string;
      
      // Find subscription by stripe_customer_id
      const { data: existing } = await supabase.from('vendor_subscriptions')
        .select('provider_id')
        .eq('stripe_customer_id', customerId)
        .single();
        
      if (!existing) {
          logger.error('Subscription update for unknown customer', { customer_id: customerId });
          return;
      }

      // Get plan details from subscription
      const priceId = subscription.items.data[0]?.price.id
      let planType = 'free'
      let billingCycle = 'monthly'
      
      // Try to determine plan type from price ID or metadata
      if (priceId) {
        // Check if we can determine from price ID pattern or query subscription_plans
        const supabaseForPlan = createSupabaseServerClient()
        const { data: plan } = await supabaseForPlan
          .from('subscription_plans')
          .select('plan_type, billing_cycle')
          .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_annual.eq.${priceId}`)
          .single()
        
        if (plan) {
          planType = plan.plan_type
          billingCycle = plan.billing_cycle
        }
      }

      // Check if subscription has trial period
      const trialStart = subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null
      const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null

      await supabase.from('vendor_subscriptions').update({
          subscription_status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          plan_id: priceId,
          plan_type: planType,
          billing_cycle: billingCycle,
          trial_start: trialStart,
          trial_end: trialEnd,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          updated_at: new Date().toISOString()
      }).eq('stripe_customer_id', customerId);
  }

  /**
   * Update subscription (e.g., change plan, cancel at period end)
   */
  static async updateSubscription(
    subscriptionId: string,
    params: {
      cancel_at_period_end?: boolean
      items?: Array<{ price: string; quantity?: number }>
      metadata?: Record<string, string>
    }
  ): Promise<Stripe.Subscription> {
    if (getIsMockMode()) {
      return {
        id: subscriptionId,
        object: 'subscription',
        status: params.cancel_at_period_end ? 'active' : 'active',
        cancel_at_period_end: params.cancel_at_period_end || false,
        current_period_end: Date.now() / 1000 + 2592000, // 30 days
        current_period_start: Date.now() / 1000,
        customer: 'cus_mock',
        items: {
          object: 'list',
          data: [],
          has_more: false,
          url: '',
        },
        livemode: false,
        metadata: params.metadata || {},
        created: Date.now() / 1000,
      } as unknown as Stripe.Subscription;
    }

    try {
      const stripe = getStripe();
      if (!stripe) throw new Error('Stripe client not initialized');

      const updateParams: Stripe.SubscriptionUpdateParams = {};
      
      if (params.cancel_at_period_end !== undefined) {
        updateParams.cancel_at_period_end = params.cancel_at_period_end;
      }
      
      if (params.items) {
        updateParams.items = params.items;
      }
      
      if (params.metadata) {
        updateParams.metadata = params.metadata;
      }

      return await stripe.subscriptions.update(subscriptionId, updateParams);
    } catch (error) {
      logger.error('Error updating subscription', errorToContext(error));
      throw new Error(`Failed to update subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel subscription immediately
   */
  static async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    if (getIsMockMode()) {
      return {
        id: subscriptionId,
        object: 'subscription',
        status: 'canceled',
        cancel_at_period_end: false,
        canceled_at: Date.now() / 1000,
        current_period_end: Date.now() / 1000,
        current_period_start: Date.now() / 1000 - 2592000,
        customer: 'cus_mock',
        items: {
          object: 'list',
          data: [],
          has_more: false,
          url: '',
        },
        livemode: false,
        metadata: {},
        created: Date.now() / 1000,
      } as unknown as Stripe.Subscription;
    }

    try {
      const stripe = getStripe();
      if (!stripe) throw new Error('Stripe client not initialized');

      return await stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      logger.error('Error canceling subscription', errorToContext(error));
      throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
