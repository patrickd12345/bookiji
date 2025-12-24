import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers';

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const config = getSupabaseConfig()
    const supabase = createServerClient(
      config.url,
      config.publishableKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (_error) {
              // The `setAll` method was called from a Server Component or Route Handler.
              // This can be ignored if you have middleware refreshing user sessions.
            }
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

    // Get block ID from URL
    const url = new URL(request.url);
    const blockId = url.searchParams.get('id');

    if (!blockId) {
      return NextResponse.json(
        { error: 'Block ID is required' },
        { status: 400 }
      );
    }

    // Verify the user owns this block
    const { data: existingBlock } = await supabase
      .from('user_blocks')
      .select('*')
      .eq('id', blockId)
      .eq('blocker_id', user.id)
      .single();

    if (!existingBlock) {
      return NextResponse.json(
        { error: 'Block not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete the block
    const { error: deleteError } = await supabase
      .from('user_blocks')
      .delete()
      .eq('id', blockId)
      .eq('blocker_id', user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete block' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in blocks/delete:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 