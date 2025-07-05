import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { BlockListResponse } from '@/types/global';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get blocks created by the user
    const { data: blocks, error: blocksError } = await supabase
      .from('user_blocks')
      .select('*')
      .eq('blocker_id', user.id);

    if (blocksError) {
      return NextResponse.json(
        { error: 'Failed to fetch blocks' },
        { status: 500 }
      );
    }

    // Get blocks where the user is blocked
    const { data: blockedBy, error: blockedByError } = await supabase
      .from('user_blocks')
      .select('*')
      .eq('blocked_id', user.id);

    if (blockedByError) {
      return NextResponse.json(
        { error: 'Failed to fetch blocks' },
        { status: 500 }
      );
    }

    const response: BlockListResponse = {
      blocks: blocks || [],
      blocked_by: blockedBy || []
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in blocks/list:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 