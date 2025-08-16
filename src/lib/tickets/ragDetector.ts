import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

export type Ticket = {
  id: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'resolved'
  resolution?: string
  ragSuggested?: boolean
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
}

function keywordSimilarity(a: string, b: string): number {
  const ta = new Set(tokenize(a))
  const tb = new Set(tokenize(b))
  const inter = [...ta].filter(t => tb.has(t)).length
  const union = new Set([...ta, ...tb]).size
  return union === 0 ? 0 : inter / union
}

export async function autoDetectRagCandidate(ticketId: string) {
  const admin = createSupabaseServerClient()
  const { data: settings } = await admin.from('admin_settings').select('rag_frequency_threshold, rag_auto_detect_enabled').limit(1).maybeSingle()
  if (!settings?.rag_auto_detect_enabled) return

  const { data: t } = await admin.from('support_tickets').select('id, subject, body, status, resolution').eq('id', ticketId).maybeSingle()
  if (!t || t.status !== 'resolved' || !t.resolution) return

  // compare with past resolved tickets
  const { data: past } = await admin.from('support_tickets').select('id, subject, resolution').neq('id', ticketId).eq('status', 'resolved').limit(200)
  const targetText = `${t.subject} ${t.resolution}`
  const similar = (past || []).filter(p => keywordSimilarity(`${p.subject} ${p.resolution || ''}`, targetText) >= 0.4)
  const meets = similar.length + 1 /* include this one */ >= (settings.rag_frequency_threshold ?? 3)
  if (meets) {
    await admin.from('support_tickets').update({ rag_suggested: true }).eq('id', ticketId)
  }
}


