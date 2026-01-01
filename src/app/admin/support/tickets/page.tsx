'use client'

import { useEffect, useState } from 'react'

interface Ticket {
  id: string
  title: string
  description: string
  status: string
  created_at: string
  user_id: string
}

interface SupportMessage {
  id: string
  message: string
  sender_id: string | null
  sender_type: string
  is_internal: boolean
  created_at: string
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)

  const loadTickets = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/support/tickets/list?status=open')
      const data = await res.json()
      if (data.ok) setTickets(data.data)
    } catch (_e) {
      // Error loading tickets
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`)
      const data = await res.json()
      if (data.ok) setMessages(data.data)
    } catch (_e) {
      // Error loading messages
    }
  }

  const sendMessage = async () => {
    if (!selectedTicket || !messageText.trim()) return
    setSending(true)
    try {
      await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText })
      })
      setMessageText('')
      loadMessages(selectedTicket.id)
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [])

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id)
    } else {
      setMessages([])
    }
  }, [selectedTicket])

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <h1 className="text-2xl font-bold mb-6">Open Support Tickets</h1>
      {loading && <p>Loading…</p>}
      {!loading && tickets.length === 0 && <p>No open tickets 🎉</p>}
      <div className="space-y-4">
        {tickets.map((t) => (
          <div
            key={t.id}
            className="bg-white border rounded p-4 shadow-sm cursor-pointer hover:border-blue-400"
            onClick={() => setSelectedTicket(t)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">{t.title}</h3>
                <p className="text-gray-600 text-sm whitespace-pre-wrap mb-2 line-clamp-3">
                  {t.description}
                </p>
                <p className="text-xs text-gray-400">Created {new Date(t.created_at).toLocaleString()}</p>
              </div>
              <span className="text-xs text-blue-600 self-start">{t.status}</span>
            </div>
          </div>
        ))}
      </div>

      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelectedTicket(null)}></div>
          <div className="w-full sm:max-w-md bg-white shadow-xl p-6 overflow-y-auto">
            <h3 className="text-xl font-semibold mb-2">{selectedTicket.title}</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap mb-4">
              {selectedTicket.description}
            </p>
            <p className="text-xs text-gray-400 mb-2">
              Created {new Date(selectedTicket.created_at).toLocaleString()} by user {selectedTicket.user_id}
            </p>

            {/* Message thread */}
            <div className="max-h-64 overflow-y-auto border rounded mb-4 p-3 bg-gray-50 space-y-2 text-sm">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`rounded px-2 py-1 max-w-xs break-words ${
                      m.sender_type === 'agent'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border'
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

            {/* Send message */}
            <div className="flex items-center gap-2 mb-6">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 border rounded px-2 py-1 text-sm"
                placeholder="Type a reply…"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !messageText.trim()}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
              >
                Send
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={async () => {
                  await fetch('/api/support/tickets/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticketId: selectedTicket.id, status: 'in_progress' })
                  })
                  setSelectedTicket(null)
                  loadTickets()
                }}
                className="w-full py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
              >
                Start Working
              </button>
              <button
                onClick={async () => {
                  await fetch('/api/support/tickets/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticketId: selectedTicket.id, status: 'escalated' })
                  })
                  setSelectedTicket(null)
                  loadTickets()
                }}
                className="w-full py-2 rounded bg-yellow-600 text-white hover:bg-yellow-700 text-sm"
              >
                Escalate
              </button>
              <button
                onClick={async () => {
                  await fetch('/api/support/tickets/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticketId: selectedTicket.id, status: 'closed' })
                  })
                  setSelectedTicket(null)
                  loadTickets()
                }}
                className="w-full py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
              >
                Resolve & Close
              </button>
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-full py-2 rounded border text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 