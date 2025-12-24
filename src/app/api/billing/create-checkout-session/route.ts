import { NextResponse } from 'next/server';
import { AuthManager } from '@/lib/auth';
import { StripeService } from '@/lib/services/stripe';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function POST(req: Request) {
  try {
    const user = await AuthManager.getCurrentUser();
    
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { priceId, successUrl, cancelUrl } = await req.json();

    if (!priceId || !successUrl || !cancelUrl) {
      return new NextResponse('Missing parameters', { status: 400 });
    }

    // Check for existing customer ID
    const supabase = createSupabaseServerClient();
    const { data: subscription } = await supabase
      .from('vendor_subscriptions')
      .select('stripe_customer_id')
      .eq('provider_id', user.id) // Assuming user.id maps to provider_id (profiles.id). Wait.
      .single();

    // NOTE: user.id is auth.users.id. provider_id in vendor_subscriptions is profiles.id.
    // We need to fetch profiles.id first.
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return new NextResponse('Profile not found', { status: 404 });
    }

    // Now check subscription with profile.id
    const { data: existingSub } = await supabase
      .from('vendor_subscriptions')
      .select('stripe_customer_id')
      .eq('provider_id', profile.id)
      .single();

    const url = await StripeService.createSubscriptionCheckoutSession(
      priceId,
      profile.id,
      profile.email,
      successUrl,
      cancelUrl,
      existingSub?.stripe_customer_id || undefined
    );

    if (!url) {
      return new NextResponse('Failed to create session', { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

