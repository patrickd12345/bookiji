/**
 * Summarize Incident
 * 
 * Uses LLM only for rephrasing facts into human language.
 * Never introduces new claims. Falls back to deterministic text if LLM unavailable.
 */

import type { IncidentStatusSnapshot } from './getIncidentSnapshot'
import type { SeverityExplanation } from './computeSeverity'
import { logger, errorToContext } from '@/lib/logger'

export type SummaryCommand = 'STATUS' | 'WHY' | 'CHANGES' | 'HELP'

export interface IncidentSummary {
  summary: string
  used_llm: boolean
}

/**
 * Summarize incident for STATUS command
 */
export async function summarizeStatus(
  incident: IncidentStatusSnapshot,
  severity: SeverityExplanation
): Promise<IncidentSummary> {
  const snapshot = incident.snapshot
  const assessment = incident.assessment

  // Build deterministic summary
  const deterministic = `STATUS — Bookiji (${incident.env.toUpperCase()})

Issue: ${assessment.assessment.split('.')[0] || 'System incident'}
Severity: ${severity.severity}
Since: ${incident.time_since_start} min ago

Scheduling: ${snapshot.system_state.scheduling_enabled ? 'ENABLED' : 'DISABLED'}
Bookings impacted: ${snapshot.signals.booking_failures ? 'Yes' : 'No'}
Payments impacted: ${snapshot.signals.stripe_webhook_backlog ? 'Yes' : 'No'}

Playbook: ${incident.active_playbook ? incident.active_playbook.playbook_id : 'Not started'}`

  // Try LLM summarization (non-authoritative)
  try {
    const llmSummary = await summarizeWithLLM(incident, severity, 'STATUS')
    if (llmSummary) {
      return {
        summary: llmSummary,
        used_llm: true
      }
    }
  } catch (error) {
    logger.error('[Jarvis] LLM summarization failed', { ...errorToContext(error), incident_id: incident.incident_id })
  }

  return {
    summary: deterministic,
    used_llm: false
  }
}

/**
 * Summarize incident for WHY command
 */
export async function summarizeWhy(
  incident: IncidentStatusSnapshot,
  severity: SeverityExplanation
): Promise<IncidentSummary> {
  const snapshot = incident.snapshot
  const assessment = incident.assessment

  // Build deterministic explanation
  const activeSignals: string[] = []
  if (snapshot.signals.error_rate_spike) activeSignals.push('Error rate spike')
  if (snapshot.signals.booking_failures) activeSignals.push('Booking failures')
  if (snapshot.signals.stripe_webhook_backlog) activeSignals.push('Payment backlog')
  if (snapshot.signals.invariant_violations.length > 0) {
    activeSignals.push(`${snapshot.signals.invariant_violations.length} invariant violation(s)`)
  }

  const safeSignals: string[] = []
  if (!snapshot.signals.booking_failures) safeSignals.push('Bookings operating normally')
  if (!snapshot.signals.stripe_webhook_backlog) safeSignals.push('Payments processing normally')
  if (snapshot.safe_components.length > 0) {
    safeSignals.push(`Safe components: ${snapshot.safe_components.join(', ')}`)
  }

  const deterministic = `WHY — Incident Root Cause

Triggered by: ${activeSignals.join(', ') || 'No active signals'}

First signal: ${assessment.assessment}

${severity.downgrade_reasons && severity.downgrade_reasons.length > 0
  ? `Calming signals:\n${severity.downgrade_reasons.map(r => `- ${r}`).join('\n')}`
  : safeSignals.length > 0
  ? `Calming signals:\n${safeSignals.map(s => `- ${s}`).join('\n')}`
  : 'No calming signals detected'}`

  // Try LLM summarization
  try {
    const llmSummary = await summarizeWithLLM(incident, severity, 'WHY')
    if (llmSummary) {
      return {
        summary: llmSummary,
        used_llm: true
      }
    }
  } catch (error) {
    logger.error('[Jarvis] LLM summarization failed', { ...errorToContext(error), incident_id: incident.incident_id })
  }

  return {
    summary: deterministic,
    used_llm: false
  }
}

/**
 * Summarize changes since last update
 */
export async function summarizeChanges(
  current: IncidentStatusSnapshot,
  previous: IncidentStatusSnapshot | null
): Promise<IncidentSummary> {
  if (!previous) {
    return {
      summary: 'CHANGES — No previous incident found for comparison',
      used_llm: false
    }
  }

  const currentSnapshot = current.snapshot
  const previousSnapshot = previous.snapshot

  // Compare signals
  const newErrors: string[] = []
  const resolvedSignals: string[] = []

  if (currentSnapshot.signals.error_rate_spike && !previousSnapshot.signals.error_rate_spike) {
    newErrors.push('Error rate spike started')
  } else if (!currentSnapshot.signals.error_rate_spike && previousSnapshot.signals.error_rate_spike) {
    resolvedSignals.push('Error rate spike resolved')
  }

  if (currentSnapshot.signals.booking_failures && !previousSnapshot.signals.booking_failures) {
    newErrors.push('Booking failures started')
  } else if (!currentSnapshot.signals.booking_failures && previousSnapshot.signals.booking_failures) {
    resolvedSignals.push('Booking failures resolved')
  }

  if (currentSnapshot.signals.stripe_webhook_backlog && !previousSnapshot.signals.stripe_webhook_backlog) {
    newErrors.push('Payment backlog started')
  } else if (!currentSnapshot.signals.stripe_webhook_backlog && previousSnapshot.signals.stripe_webhook_backlog) {
    resolvedSignals.push('Payment backlog resolved')
  }

  // Determine trend
  let trend = 'stable'
  if (newErrors.length > resolvedSignals.length) {
    trend = 'worsening'
  } else if (resolvedSignals.length > newErrors.length) {
    trend = 'improving'
  }

  const deterministic = `CHANGES — Since Last Update

New issues:
${newErrors.length > 0 ? newErrors.map(e => `- ${e}`).join('\n') : 'None'}

Resolved:
${resolvedSignals.length > 0 ? resolvedSignals.map(r => `- ${r}`).join('\n') : 'None'}

Trend: ${trend}
Last change: ${previous.sent_at}`

  return {
    summary: deterministic,
    used_llm: false
  }
}

/**
 * Summarize with LLM (non-authoritative, fallback to deterministic)
 */
async function summarizeWithLLM(
  incident: IncidentStatusSnapshot,
  severity: SeverityExplanation,
  command: SummaryCommand
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    return null
  }

  const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini'
  const baseUrl = process.env.GROQ_API_KEY 
    ? 'https://api.groq.com/openai/v1'
    : 'https://api.openai.com/v1'

  const systemPrompt = `You are Jarvis summarizing incident information for an operator at 3AM.

Rephrase the provided facts into calm, clear language.
Do NOT introduce new claims.
Do NOT infer state or risk.
Only rephrase what is explicitly stated.

Use calm tone. No emojis except ✅ ⚠️ ❌.
Keep it concise.`

  const userPrompt = `Incident: ${incident.assessment.assessment}
Severity: ${severity.severity}
Environment: ${incident.env}
Time since start: ${incident.time_since_start} minutes
Scheduling: ${incident.snapshot.system_state.scheduling_enabled ? 'enabled' : 'disabled'}
Bookings impacted: ${incident.snapshot.signals.booking_failures ? 'yes' : 'no'}
Payments impacted: ${incident.snapshot.signals.stripe_webhook_backlog ? 'yes' : 'no'}

Rephrase for ${command} command:`

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 200
      })
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content?.trim()

    return content || null
  } catch {
    return null
  }
}

