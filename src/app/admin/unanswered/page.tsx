"use client"

import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowserClient } from '@/lib/supabaseClient'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Unanswered {
  id: string
  query_text: string
  source: string
  created_at: string
  processed: boolean
}

export default function UnansweredPage() {
  const [items, setItems] = useState<Unanswered[]>([])
  const [loading, setLoading] = useState(false)

  const fetchItems = useCallback(async () => {
    const supabase = supabaseBrowserClient()
    if (!supabase) return
    
    setLoading(true)
    const { data, error } = await supabase
      .from('support_unanswered_questions')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error(error)
    else setItems(data as Unanswered[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  async function markProcessed(id: string) {
    const supabase = supabaseBrowserClient()
    if (!supabase) return
    
    const { error } = await supabase
      .from('support_unanswered_questions')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('id', id)
    if (error) console.error(error)
    fetchItems()
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Unanswered Customer Questions</h1>
      {loading && <p className="text-sm text-gray-500">Loading</p>}
      <Card className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Question</th>
              <th className="py-2">Source</th>
              <th className="py-2">Date</th>
              <th className="py-2">Processed</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((q) => (
              <tr key={q.id} className="border-b">
                <td className="py-2 max-w-xs">{q.query_text}</td>
                <td className="py-2">{q.source}</td>
                <td className="py-2">{new Date(q.created_at).toLocaleString()}</td>
                <td className="py-2">{q.processed ? '✔️' : '❌'}</td>
                <td className="py-2">
                  {!q.processed && (
                    <Button size="sm" onClick={() => markProcessed(q.id)}>
                      Mark done
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-500">
                  No unanswered questions 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
} 