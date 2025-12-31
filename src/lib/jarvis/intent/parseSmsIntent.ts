/**
 * SMS Intent Parser
 * 
 * Layer 1: Deterministic Parser (Authoritative)
 * Layer 2: LLM Parser (Non-Authoritative, for context extraction only)
 * 
 * Jarvis never executes actions based on LLM interpretation alone.
 * Deterministic parser is the source of truth.
 */

import { logger, errorToContext } from '@/lib/logger'

import type { ParsedIntent } from '../types'

/**
 * Parse SMS intent - deterministic first, LLM for context only
 */
export async function parseSmsIntent(replyText: string): Promise<ParsedIntent> {
  // Layer 1: Deterministic parser (authoritative)
  const deterministic = parseDeterministic(replyText)
  
  // If no actions found deterministically, return empty (no execution)
  if (deterministic.actions.length === 0) {
    return {
      actions: [],
      confidence: 'low'
    }
  }

  // Layer 2: LLM for context extraction (non-authoritative)
  let context: string | undefined
  try {
    const llmContext = await extractContextWithLLM(replyText)
    context = llmContext
  } catch (error) {
    // LLM failure is non-fatal - we still have deterministic actions
    logger.error('[Jarvis] LLM context extraction failed', { ...errorToContext(error), reply_text_length: replyText.length })
  }

  return {
    actions: deterministic.actions,
    context,
    confidence: deterministic.confidence
  }
}

/**
 * Deterministic parser - recognizes explicit commands
 * 
 * Recognizes:
 * - "A" → maps to action based on context (not used for scheduling)
 * - "ENABLE SCHEDULING" → ENABLE_SCHEDULING
 * - "DISABLE SCHEDULING" → DISABLE_SCHEDULING
 * - "TURN ON SCHEDULING" → ENABLE_SCHEDULING
 * - "TURN OFF SCHEDULING" → DISABLE_SCHEDULING
 * - "START <PLAYBOOK_ID>" → Playbook start command
 * - "NEXT" → Execute next playbook step
 * - "SKIP" → Skip current playbook step
 * - "ABORT" → Abort active playbook
 */
function parseDeterministic(replyText: string): ParsedIntent {
  const text = replyText.trim().toUpperCase()
  const actions: string[] = []

  // Read-only status commands (check first)
  if (/^STATUS$/.test(text)) {
    actions.push('STATUS_QUERY')
    return {
      actions,
      confidence: 'high'
    }
  }

  if (/^WHY$/.test(text)) {
    actions.push('WHY_QUERY')
    return {
      actions,
      confidence: 'high'
    }
  }

  if (/^CHANGES$/.test(text)) {
    actions.push('CHANGES_QUERY')
    return {
      actions,
      confidence: 'high'
    }
  }

  if (/^HELP$/.test(text)) {
    actions.push('HELP_QUERY')
    return {
      actions,
      confidence: 'high'
    }
  }

  // ACK command (acknowledge incident, freeze escalation)
  if (/^ACK$|^ACKNOWLEDGE$|^ACKNOWLEDGED$/.test(text)) {
    actions.push('ACK_INCIDENT')
    return {
      actions,
      confidence: 'high'
    }
  }

  // Playbook commands (check before action commands)
  if (/^START\s+/.test(text)) {
    // Extract playbook ID (e.g., "START SCHEDULING_DEGRADED_V1")
    const match = text.match(/^START\s+(\w+)/)
    if (match) {
      actions.push(`PLAYBOOK_START:${match[1]}`)
      return {
        actions,
        confidence: 'high'
      }
    }
  }

  if (/^NEXT$/.test(text)) {
    actions.push('PLAYBOOK_NEXT')
    return {
      actions,
      confidence: 'high'
    }
  }

  if (/^SKIP$/.test(text)) {
    actions.push('PLAYBOOK_SKIP')
    return {
      actions,
      confidence: 'high'
    }
  }

  if (/^ABORT$/.test(text)) {
    actions.push('PLAYBOOK_ABORT')
    return {
      actions,
      confidence: 'high'
    }
  }

  // Explicit scheduling commands (case-insensitive)
  const enablePatterns = [
    /ENABLE\s+SCHEDULING/i,
    /TURN\s+ON\s+SCHEDULING/i,
    /START\s+SCHEDULING/i,
    /RESUME\s+SCHEDULING/i
  ]

  const disablePatterns = [
    /DISABLE\s+SCHEDULING/i,
    /TURN\s+OFF\s+SCHEDULING/i,
    /STOP\s+SCHEDULING/i,
    /PAUSE\s+SCHEDULING/i
  ]

  // Check for enable patterns
  for (const pattern of enablePatterns) {
    if (pattern.test(text)) {
      actions.push('ENABLE_SCHEDULING')
      break
    }
  }

  // Check for disable patterns
  for (const pattern of disablePatterns) {
    if (pattern.test(text)) {
      actions.push('DISABLE_SCHEDULING')
      break
    }
  }

  // Note: We don't map "A", "B", "C" to actions here
  // Those are handled by the existing parseSMSReply for incident responses
  // This parser is specifically for direct command execution

  return {
    actions: [...new Set(actions)], // Remove duplicates
    confidence: actions.length > 0 ? 'high' : 'low'
  }
}

/**
 * Extract context using LLM (non-authoritative)
 * 
 * Only extracts free-text context, never determines actions.
 */
async function extractContextWithLLM(replyText: string): Promise<string | undefined> {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    return undefined
  }

  const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini'
  const baseUrl = process.env.GROQ_API_KEY 
    ? 'https://api.groq.com/openai/v1'
    : 'https://api.openai.com/v1'

  const systemPrompt = `You are Jarvis extracting context from an operator's SMS reply.

Extract ONLY free-text context (e.g., "baby woke up", "handle it", "don't wake me").
Do NOT determine actions. Do NOT suggest commands.
Return only the context as plain text, or "none" if no context found.`

  const userPrompt = `Operator reply: "${replyText}"

Extract context only (no actions, no commands):`

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
        max_tokens: 100
      })
    })

    if (!response.ok) {
      return undefined
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content?.trim()

    if (!content || content.toLowerCase() === 'none') {
      return undefined
    }

    return content
  } catch {
    return undefined
  }
}

