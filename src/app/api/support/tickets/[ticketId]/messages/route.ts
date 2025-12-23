import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from '@/config/supabase'
import { z } from 'zod'

// Helper to get or create a conversation for a ticket
async function ensureConversationId(supabase: any, ticketId: string, userId: string) {
  // Try to find existing conversation
  const { data: existing } = await supabase
    .from('support_conversations')
    .select('id')
    .eq('ticket_id', ticketId)
    .maybeSingle()

  if (existing?.id) {
    return existing.id
  }

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from('support_conversations')
    .insert({
      ticket_id: ticketId,
      user_id: userId,
      message: 'Conversation started',
      is_from_user: true
    })
    .select('id')
    .single()

  if (error) throw error
  return newConv.id
}

// GET /api/support/tickets/:ticketId/messages
export async function GET(req: NextRequest) {
  const ticketId = new URL(req.url).pathname.split('/')[4]
  const cookieStore = await cookies()
  const config = getSupabaseConfig()

  try {
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
            } catch (error) {
              // The `setAll` method was called from a Server Component or Route Handler.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          }
        }
      }
    )

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get or create conversation
    const conversationId = await ensureConversationId(supabase, ticketId, user.id)

    // Fetch messages using conversation_id
    const { data, error } = await supabase
      .from('support_messages')
      .select('id,message,sender_id,message_type,created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(500)

    if (error) throw error

    // Transform data to match frontend expectations
    const transformed = data?.map(msg => ({
      id: msg.id,
      message: msg.message,
      sender_id: msg.sender_id,
      sender_type: msg.sender_id === user.id ? 'customer' : 'agent',
      is_internal: false,
      created_at: msg.created_at
    })) || []

    return NextResponse.json({ ok: true, data: transformed })
  } catch (error: any) {
    console.error('Error fetching ticket messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/support/tickets/:ticketId/messages
const postSchema = z.object({
  message: z.string().min(1).max(5000),
  sender_type: z.enum(['customer', 'agent', 'system']).optional()
})

export async function POST(req: NextRequest) {
  const ticketId = new URL(req.url).pathname.split('/')[4]
  const cookieStore = await cookies()
  const config = getSupabaseConfig()

  try {
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
            } catch (error) {
              // The `setAll` method was called from a Server Component or Route Handler.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          }
        }
      }
    )

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { message } = postSchema.parse(body)

    // Get or create conversation
    const conversationId = await ensureConversationId(supabase, ticketId, user.id)

    // Insert message using conversation_id and sender_id from session
    const { data, error } = await supabase
      .from('support_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message,
        message_type: 'text'
      })
      .select('id,message,sender_id,message_type,created_at')
      .single()

    if (error) throw error

    // Transform response to match frontend expectations
    const transformed = {
      id: data.id,
      message: data.message,
      sender_id: data.sender_id,
      sender_type: 'customer',
      is_internal: false,
      created_at: data.created_at
    }

    return NextResponse.json({ ok: true, data: transformed })
  } catch (error: any) {
    console.error('Error creating ticket message:', error);
    return NextResponse.json(
      { error: 'Failed to create message', details: error.message },
      { status: 500 }
    );
  }
} 