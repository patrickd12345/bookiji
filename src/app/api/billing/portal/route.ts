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

    const { returnUrl } = await req.json();

    if (!returnUrl) {
      return new NextResponse('Missing parameters', { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    
    // Get profile id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return new NextResponse('Profile not found', { status: 404 });
    }

    const { data: subscription } = await supabase
      .from('vendor_subscriptions')
      .select('stripe_customer_id')
      .eq('provider_id', profile.id)
      .single();

    if (!subscription?.stripe_customer_id) {
        return new NextResponse('No subscription found', { status: 404 });
    }

    const url = await StripeService.createBillingPortalSession(
      subscription.stripe_customer_id,
      returnUrl
    );

    if (!url) {
      return new NextResponse('Failed to create portal session', { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

