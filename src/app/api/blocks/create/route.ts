import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers';
import { BlockUserRequest } from '@/types/global';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const config = getSupabaseConfig()
    const supabase = createServerClient(
      config.url,
      config.publishableKey,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          }
        }
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { blocked_id, reason } = body as BlockUserRequest;

    if (!blocked_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user is trying to block themselves
    if (blocked_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot block yourself' },
        { status: 400 }
      );
    }

    // Check if block already exists
    const { data: existingBlock } = await supabase
      .from('user_blocks')
      .select('*')
      .eq('blocker_id', user.id)
      .eq('blocked_id', blocked_id)
      .single();

    if (existingBlock) {
      return NextResponse.json(
        { error: 'Block already exists' },
        { status: 400 }
      );
    }

    // Create the block
    const { data: block, error: blockError } = await supabase
      .from('user_blocks')
      .insert([
        {
          blocker_id: user.id,
          blocked_id,
          reason: reason || null
        }
      ])
      .select()
      .single();

    if (blockError) {
      return NextResponse.json(
        { error: 'Failed to create block' },
        { status: 500 }
      );
    }

    return NextResponse.json(block);
  } catch (error) {
    console.error('Error in blocks/create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 