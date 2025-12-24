import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';
import { withQueryLogging } from '@/lib/performance/queryLogger';
import { withRateLimit, apiRateLimiter } from '@/middleware/rateLimiter';
import { RichProviderProfile, ProviderProfileUpdate } from '@/types/provider';

export const GET = withRateLimit(apiRateLimiter, async (request: NextRequest) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get provider ID from query params or use current user
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('id') || user.id;

    // Get provider profile with all related data
    const profile = await withQueryLogging(
      async () => {
        // Get basic profile data
        const { data: profileData, error: profileError } = await supabase
          .from('provider_profile_summary')
          .select('*')
          .eq('id', providerId)
          .single();

        if (profileError) throw profileError;

        // Get detailed related data
        const [
          { data: certifications },
          { data: education },
          { data: portfolio },
          { data: languages }
        ] = await Promise.all([
          supabase
            .from('provider_certifications')
            .select('*')
            .eq('provider_id', providerId)
            .order('created_at', { ascending: false }),
          
          supabase
            .from('provider_education')
            .select('*')
            .eq('provider_id', providerId)
            .order('end_year', { ascending: false }),
          
          supabase
            .from('provider_portfolio')
            .select('*')
            .eq('provider_id', providerId)
            .order('display_order', { ascending: true }),
          
          supabase
            .from('provider_languages')
            .select('*')
            .eq('provider_id', providerId)
            .order('is_primary', { ascending: false })
        ]);

        return {
          ...profileData,
          certifications: certifications || [],
          education: education || [],
          portfolio: portfolio || [],
          provider_languages: languages || []
        } as RichProviderProfile;
      },
      {
        query: 'get_provider_profile_with_relations',
        table: 'provider_profile_summary',
        operation: 'SELECT',
        userId: user.id,
        endpoint: '/api/provider/profile'
      }
    );

    return NextResponse.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Provider profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider profile' },
      { status: 500 }
    );
  }
});

export const PUT = withRateLimit(apiRateLimiter, async (request: NextRequest) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a provider
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'provider') {
      return NextResponse.json({ error: 'Only providers can update profiles' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: ProviderProfileUpdate = body;

    // Update provider profile
    const updatedProfile = await withQueryLogging(
      async () => {
        const { data, error } = await supabase
          .from('users')
          .update({
            bio: updateData.bio,
            portfolio_images: updateData.portfolio_images,
            specializations: updateData.specializations,
            experience_years: updateData.experience_years,
            hourly_rate: updateData.hourly_rate,
            availability_schedule: updateData.availability_schedule,
            professional_summary: updateData.professional_summary,
            service_area_radius: updateData.service_area_radius,
            social_links: updateData.social_links,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      },
      {
        query: 'update_provider_profile',
        table: 'users',
        operation: 'UPDATE',
        userId: user.id,
        endpoint: '/api/provider/profile'
      }
    );

    return NextResponse.json({
      success: true,
      data: updatedProfile
    });

  } catch (error) {
    console.error('Provider profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update provider profile' },
      { status: 500 }
    );
  }
});

export const PATCH = withRateLimit(apiRateLimiter, async (request: NextRequest) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, data: actionData } = body;

    switch (action) {
      case 'add_certification':
        const { data: newCert, error: certError } = await supabase
          .from('provider_certifications')
          .insert({
            provider_id: user.id,
            ...actionData
          })
          .select()
          .single();

        if (certError) throw certError;
        return NextResponse.json({ success: true, data: newCert });

      case 'add_education':
        const { data: newEdu, error: eduError } = await supabase
          .from('provider_education')
          .insert({
            provider_id: user.id,
            ...actionData
          })
          .select()
          .single();

        if (eduError) throw eduError;
        return NextResponse.json({ success: true, data: newEdu });

      case 'add_portfolio':
        const { data: newPortfolio, error: portfolioError } = await supabase
          .from('provider_portfolio')
          .insert({
            provider_id: user.id,
            ...actionData
          })
          .select()
          .single();

        if (portfolioError) throw portfolioError;
        return NextResponse.json({ success: true, data: newPortfolio });

      case 'add_language':
        const { data: newLang, error: langError } = await supabase
          .from('provider_languages')
          .insert({
            provider_id: user.id,
            ...actionData
          })
          .select()
          .single();

        if (langError) throw langError;
        return NextResponse.json({ success: true, data: newLang });

      case 'update_certification':
        const { id: certId, ...certUpdateData } = actionData;
        const { data: updatedCert, error: certUpdateError } = await supabase
          .from('provider_certifications')
          .update(certUpdateData)
          .eq('id', certId)
          .eq('provider_id', user.id)
          .select()
          .single();

        if (certUpdateError) throw certUpdateError;
        return NextResponse.json({ success: true, data: updatedCert });

      case 'delete_certification':
        const { error: certDeleteError } = await supabase
          .from('provider_certifications')
          .delete()
          .eq('id', actionData.id)
          .eq('provider_id', user.id);

        if (certDeleteError) throw certDeleteError;
        return NextResponse.json({ success: true });

      case 'update_education':
        const { id: eduId, ...eduUpdateData } = actionData;
        const { data: updatedEdu, error: eduUpdateError } = await supabase
          .from('provider_education')
          .update(eduUpdateData)
          .eq('id', eduId)
          .eq('provider_id', user.id)
          .select()
          .single();

        if (eduUpdateError) throw eduUpdateError;
        return NextResponse.json({ success: true, data: updatedEdu });

      case 'delete_education':
        const { error: eduDeleteError } = await supabase
          .from('provider_education')
          .delete()
          .eq('id', actionData.id)
          .eq('provider_id', user.id);

        if (eduDeleteError) throw eduDeleteError;
        return NextResponse.json({ success: true });

      case 'update_portfolio':
        const { id: portfolioId, ...portfolioUpdateData } = actionData;
        const { data: updatedPortfolio, error: portfolioUpdateError } = await supabase
          .from('provider_portfolio')
          .update(portfolioUpdateData)
          .eq('id', portfolioId)
          .eq('provider_id', user.id)
          .select()
          .single();

        if (portfolioUpdateError) throw portfolioUpdateError;
        return NextResponse.json({ success: true, data: updatedPortfolio });

      case 'delete_portfolio':
        const { error: portfolioDeleteError } = await supabase
          .from('provider_portfolio')
          .delete()
          .eq('id', actionData.id)
          .eq('provider_id', user.id);

        if (portfolioDeleteError) throw portfolioDeleteError;
        return NextResponse.json({ success: true });

      case 'update_language':
        const { id: langId, ...langUpdateData } = actionData;
        const { data: updatedLang, error: langUpdateError } = await supabase
          .from('provider_languages')
          .update(langUpdateData)
          .eq('id', langId)
          .eq('provider_id', user.id)
          .select()
          .single();

        if (langUpdateError) throw langUpdateError;
        return NextResponse.json({ success: true, data: updatedLang });

      case 'delete_language':
        const { error: langDeleteError } = await supabase
          .from('provider_languages')
          .delete()
          .eq('id', actionData.id)
          .eq('provider_id', user.id);

        if (langDeleteError) throw langDeleteError;
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Provider profile action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
});

