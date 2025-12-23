'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowserClient } from '@/lib/supabaseClient'
import { registerTour } from '@/lib/guidedTourRegistry'
import { useAutoTour } from '@/lib/useAutoTour'
import { ADSENSE_APPROVAL_MODE } from '@/lib/adsense'

interface Ticket {
  id: string
  title: string
  description: string
  status: string
  created_at: string
}

interface SupportMessage {
  id: string
  message: string
  sender_id: string | null
  sender_type: string
  is_internal: boolean
  created_at: string
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [channelRef, setChannelRef] = useState<ReturnType<NonNullable<ReturnType<typeof supabaseBrowserClient>>['channel']> | null>(null);

  const loadTickets = async (uid: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/support/tickets/list?status=all&userId=${uid}`)
      const data = await res.json()
      if (data.ok) setTickets(data.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`)
      const data = await res.json()
      if (data.ok) setMessages(data.data)
    } catch (e) {
      console.error(e)
    }
  }

  const openTicket = (t: Ticket) => {
    setSelectedTicket(t)
  }

  const closeTicketModal = () => {
    setSelectedTicket(null)
  }

  const sendMessage = async () => {
    if (!selectedTicket || !messageText.trim()) return
    setSending(true)
    try {
      await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, sender_type: 'customer' })
      })
      setMessageText('')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    const getSession = async () => {
      const supabase = supabaseBrowserClient()
      if (!supabase) return
      
      const { data: { session } } = await supabase.auth.getSession()
      // Skip auth check during AdSense approval
      if (!session?.user?.id && !ADSENSE_APPROVAL_MODE) {
        // redirect to login
        window.location.href = '/login?redirect=/help/tickets'
        return
      }
      if (session?.user?.id) {
      loadTickets(session.user.id)
      }
    }
    getSession()
  }, [])

  // load messages when ticket selected
  useEffect(() => {
    const supabase = supabaseBrowserClient()
    if (!supabase) return
    
    if (!selectedTicket) {
      setMessages([])
      if (channelRef) {
        supabase.removeChannel(channelRef)
        setChannelRef(null)
      }
      return
    }

    loadMessages(selectedTicket.id)

    // realtime supabase subscription with reconnection logic
    let channel: ReturnType<typeof supabase.channel> | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

    const subscribe = () => {
      channel = supabase
        .channel(`support_messages:${selectedTicket.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_messages',
            filter: `ticket_id=eq.${selectedTicket.id}`
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as SupportMessage])
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.error('Support chat channel error - reconnecting automatically...')
            attemptReconnect()
          } else if (status === 'CLOSED') {
            console.warn('Support chat channel closed - reconnecting automatically...')
            attemptReconnect()
          }
        })

      setChannelRef(channel)
    }

    const attemptReconnect = () => {
      if (reconnectTimeout) return
      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null
        const supabase = supabaseBrowserClient()
        if (supabase && channel) {
          supabase.removeChannel(channel)
          channel = null
        }
        subscribe()
      }, 5000)
    }

    subscribe()

    return () => {
      const supabase = supabaseBrowserClient()
      if (supabase && channel) supabase.removeChannel(channel)
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [selectedTicket, channelRef])

  useEffect(() => {
    registerTour({
      id: 'customer-tickets-chat',
      route: '/help/tickets',
      title: 'Support Tickets',
      steps: [
        { target: '[data-tour="ticket-list"]', content: 'Click a ticket to open the conversation.' },
        { target: '[data-tour="reply-box"]', content: 'Type here to reply to the support team.' }
      ]
    })
  }, [])

  useAutoTour()

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">My Support Tickets</h1>
        <p className="text-lg text-gray-600 mb-8">
          Need help? Create a support ticket and we&apos;ll get back to you as soon as possible.
        </p>
        {loading && <p>Loading</p>}
        {!loading && tickets.length === 0 && (
          <p className="text-gray-500">You have no support tickets yet.</p>
        )}
        <div className="space-y-4">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="bg-white border rounded shadow-sm p-4 cursor-pointer flex justify-between items-start hover:border-blue-400" data-tour="ticket-list"
              onClick={() => openTicket(t)}
            >
              <div>
                <h3 className="font-semibold text-gray-900">{t.title}</h3>
                <p className="text-xs text-gray-500">Opened {new Date(t.created_at).toLocaleString()}</p>
              </div>
              <span className="text-xs text-blue-600 self-start">{t.status}</span>
            </div>
          ))}
        </div>

        {/* Ticket modal */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40" onClick={closeTicketModal}></div>
            <div className="w-full sm:max-w-md bg-white shadow-xl p-6 overflow-y-auto">
              <h3 className="text-xl font-semibold mb-2">{selectedTicket.title}</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap mb-4">{selectedTicket.description}</p>
              <p className="text-xs text-gray-400 mb-2">
                Opened {new Date(selectedTicket.created_at).toLocaleString()} • Status: {selectedTicket.status}
              </p>

              {/* Messages */}
              <div className="max-h-64 overflow-y-auto border rounded mb-4 p-3 bg-gray-50 space-y-2 text-sm">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`rounded px-2 py-1 max-w-xs break-words ${
                        m.sender_type === 'customer' ? 'bg-green-600 text-white' : 'bg-white border'
                      }`}
                    >
                      {m.message}
                      <div className="text-[10px] opacity-70 mt-0.5">
                        {new Date(m.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-center text-gray-400">No messages yet</p>
                )}
              </div>

              {/* Reply box */}
              <div className="flex items-center gap-2 mb-6">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 border rounded px-2 py-1 text-sm"
                  placeholder="Type your message…"
                  data-tour="reply-box"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !messageText.trim()}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded disabled:opacity-50"
                >
                  Send
                </button>
              </div>

              <button onClick={closeTicketModal} className="w-full py-2 rounded border text-sm">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 