/**
 * SMS Handler for Jarvis
 * 
 * Outbound: Send incident reports
 * Inbound: Parse user replies (multiple choice + natural language)
 */

import { sendSMS } from '@/lib/notifications/providers'
import type { IncidentSMS, ParsedReply, JarvisAssessment, IncidentSnapshot } from './types'

/**
 * Send incident SMS to owner
 */
export async function sendIncidentSMS(
  assessment: JarvisAssessment,
  snapshot: IncidentSnapshot,
  ownerPhone: string
): Promise<{ success: boolean; error?: string }> {
  const sms = formatIncidentSMS(assessment, snapshot)

  const message = formatSMSMessage(sms)

  try {
    // Send SMS directly using Twilio (bypass template system for Jarvis)
    // We format the message ourselves for maximum control
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM
    ) {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization:
              'Basic ' +
              Buffer.from(
                `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
              ).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            From: process.env.TWILIO_FROM,
            To: ownerPhone,
            Body: message
          })
        }
      )

      if (!response.ok) {
        return {
          success: false,
          error: `Twilio error: ${response.status}`
        }
      }

      return { success: true }
    } else {
      // Development fallback - log instead of sending
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 [Jarvis Mock SMS]:', message)
        return { success: true }
      }

      // Fallback to notification system
      const result = await sendSMS(ownerPhone, 'jarvis_incident', {
        message,
        severity: sms.severity,
        environment: sms.environment
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to send SMS'
        }
      }

      return { success: true }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Format incident data into SMS structure
 */
function formatIncidentSMS(
  assessment: JarvisAssessment,
  snapshot: IncidentSnapshot
): IncidentSMS {
  return {
    severity: assessment.severity,
    environment: snapshot.env,
    what: assessment.assessment.split('.')[0] || 'System incident detected',
    impact: `Impact: ${snapshot.blast_radius.join(', ') || 'none'}`,
    safe: snapshot.safe_components,
    actions_taken: snapshot.auto_actions_taken,
    recommendations: assessment.recommended_actions.map(rec => ({
      id: rec.id,
      label: rec.label
    })),
    no_reply_action: assessment.what_happens_if_no_reply
  }
}

/**
 * Format SMS message for 3AM readability
 */
function formatSMSMessage(sms: IncidentSMS): string {
  let message = `🚨 Bookiji ${sms.severity} (${sms.environment})\n\n`
  
  message += `What: ${sms.what}\n`
  message += `${sms.impact}\n`
  
  if (sms.safe.length > 0) {
    message += `Safe: ${sms.safe.join(', ')}\n`
  }
  
  if (sms.actions_taken.length > 0) {
    message += `Actions taken: ${sms.actions_taken.join(', ')}\n`
  }
  
  message += `\nRecommended:\n`
  sms.recommendations.forEach(rec => {
    message += `${rec.id}) ${rec.label}\n`
  })
  
  message += `\nNo reply: ${sms.no_reply_action}\n`
  message += `\nReply with letters (e.g. A, B+C) or natural language.`

  return message
}

/**
 * Parse SMS reply from user
 * 
 * Handles:
 * - Multiple choice: "A", "B+C", "A and B"
 * - Natural language: "A. Baby woke up. Don't wake me unless bookings are at risk."
 * - Constraints: "Hold", "Wait", "Don't wake me"
 */
export async function parseSMSReply(
  replyText: string
): Promise<ParsedReply> {
  // Try LLM parsing first (if available)
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
  if (apiKey) {
    try {
      const llmParsed = await parseWithLLM(replyText)
      if (llmParsed) {
        return llmParsed
      }
    } catch (error) {
      console.error('LLM parsing failed, using regex fallback:', error)
    }
  }

  // Fallback to regex parsing
  return parseWithRegex(replyText)
}

/**
 * Parse reply using LLM
 */
async function parseWithLLM(replyText: string): Promise<ParsedReply | null> {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
  const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini'
  const baseUrl = process.env.GROQ_API_KEY 
    ? 'https://api.groq.com/openai/v1'
    : 'https://api.openai.com/v1'

  const systemPrompt = `You are Jarvis parsing a user's SMS reply to an incident alert.

Extract:
1. Selected choices (A, B, C, D, etc.)
2. Constraints (e.g., "don't wake me", "only if worse", "hold")
3. Natural language instruction (if any)

Output JSON only.`

  const userPrompt = `User reply: "${replyText}"

Parse and return JSON:
{
  "choices": ["A", "B"],
  "constraints": ["no further alerts unless severity increases"],
  "natural_language_instruction": "optional instruction text",
  "confidence": "high" | "medium" | "low"
}`

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
        response_format: { type: 'json_object' },
        temperature: 0.1 // Very low for parsing
      })
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return null
    }

    const parsed = JSON.parse(content) as ParsedReply

    // Validate
    return {
      choices: Array.isArray(parsed.choices) ? parsed.choices : [],
      constraints: Array.isArray(parsed.constraints) ? parsed.constraints : [],
      natural_language_instruction: parsed.natural_language_instruction,
      confidence: parsed.confidence === 'high' || parsed.confidence === 'medium' || parsed.confidence === 'low'
        ? parsed.confidence
        : 'medium'
    }
  } catch {
    return null
  }
}

/**
 * Parse reply using regex (fallback)
 */
function parseWithRegex(replyText: string): ParsedReply {
  const text = replyText.trim().toUpperCase()
  
  // Extract choices (A, B, C, D, etc.)
  const choiceRegex = /([A-Z])(?:\s*[+&,]\s*([A-Z]))?/g
  const choices: string[] = []
  let match
  
  while ((match = choiceRegex.exec(text)) !== null) {
    if (match[1]) choices.push(match[1])
    if (match[2]) choices.push(match[2])
  }

  // Extract constraints
  const constraints: string[] = []
  const constraintKeywords = [
    'DON\'T WAKE',
    'DON\'T ALERT',
    'ONLY IF',
    'HOLD',
    'WAIT',
    'UNLESS',
    'SILENT'
  ]

  constraintKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      constraints.push(`constraint: ${keyword.toLowerCase()}`)
    }
  })

  // Extract natural language (everything after first sentence or choice)
  let naturalLanguage: string | undefined
  const afterChoice = text.split(/[A-Z]\s*[.,]/)[1]
  if (afterChoice) {
    naturalLanguage = afterChoice.trim()
  }

  return {
    choices: [...new Set(choices)], // Remove duplicates
    constraints,
    natural_language_instruction: naturalLanguage || undefined,
    confidence: choices.length > 0 ? 'high' : 'low'
  }
}

