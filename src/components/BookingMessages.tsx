'use client';
import { useEffect, useRef, useState } from 'react';

interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  sender_type: 'customer' | 'provider';
  body: string;
  created_at: string;
}

interface Props {
  bookingId: string;
  userId: string;
}

export default function BookingMessages({ bookingId, userId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/bookings/${bookingId}/messages`);
      const data = await res.json();
      setMessages(data.messages || []);
    }
    load();
  }, [bookingId]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      booking_id: bookingId,
      sender_id: userId,
      sender_type: 'customer',
      body: text,
      created_at: new Date().toISOString(),
    };
    setMessages(m => [...m, optimistic]);
    setText('');
    const res = await fetch(`/api/bookings/${bookingId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: optimistic.body }),
    });
    if (res.ok) {
      const real = await res.json();
      setMessages(m => m.map(msg => (msg.id === optimistic.id ? real : msg)));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={containerRef} className="flex-1 overflow-y-auto p-2" data-testid="messages">
        {messages.map(m => (
          <div key={m.id} className={`mb-2 ${m.sender_id === userId ? 'text-right' : 'text-left'}`}>
            <div className="inline-block bg-gray-200 rounded px-2 py-1">{m.body}</div>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="p-2 flex gap-2">
        <input
          className="flex-1 border p-1"
          value={text}
          onChange={e => setText(e.target.value)}
          data-testid="message-input"
        />
        <button
          type="submit"
          className="px-2 py-1 bg-blue-500 text-white"
          disabled={!text}
          data-testid="send-button"
        >
          Send
        </button>
      </form>
    </div>
  );
}
