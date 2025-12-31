import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
       console.warn('Missing Supabase env vars for test login route')
       return NextResponse.json({ error: 'Configuration missing' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create synthetic user if doesn't exist
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email,
          full_name: `Synthetic User ${email.split('+')[1] || 'Unknown'}`,
          is_synthetic: true,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating synthetic user:', createError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      userId = newUser.id;

      // Create profile for the user
      await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          is_synthetic: true,
          created_at: new Date().toISOString(),
        });
    }

    // Generate a test session token (for testing purposes only)
    const testToken = `test_${userId}_${Date.now()}`;

    // Set a test cookie
    const response = NextResponse.json({ 
      success: true, 
      userId,
      email,
      token: testToken,
      message: 'Synthetic user logged in successfully'
    });

    // Set test authentication cookie
    response.cookies.set('test-auth-token', testToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;

  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
