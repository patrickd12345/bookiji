/**
 * Tone Profiles
 * 
 * Deterministic tone selection, LLM-assisted phrasing.
 * LLM only rephrases - never decides tone.
 */

export type ToneProfile = 'CALM_INFORMATIONAL' | 'ATTENTION_NEEDED' | 'URGENT_WAKEUP'

export interface ToneContext {
  severity: string
  timeSinceStart: number
  escalationLevel: number
  inQuietHours: boolean
}

/**
 * Select tone profile deterministically
 */
export function selectToneProfile(
  messageType: 'informational' | 'update' | 'wake' | 'escalation',
  context: ToneContext
): ToneProfile {
  // Wake messages are always urgent
  if (messageType === 'wake') {
    return 'URGENT_WAKEUP'
  }

  // Escalation messages need attention
  if (messageType === 'escalation') {
    return 'ATTENTION_NEEDED'
  }

  // First informational message is calm
  if (messageType === 'informational' && context.escalationLevel === 0) {
    return 'CALM_INFORMATIONAL'
  }

  // Updates are attention-needed if severity is high
  if (messageType === 'update') {
    if (context.severity === 'SEV-1') {
      return 'ATTENTION_NEEDED'
    }
    return 'CALM_INFORMATIONAL'
  }

  // Default: calm
  return 'CALM_INFORMATIONAL'
}

/**
 * Apply tone profile to message using LLM (optional, with fallback)
 */
export async function applyToneProfile(
  baseMessage: string,
  tone: ToneProfile
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    return getDeterministicToneMessage(baseMessage, tone)
  }

  const model = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini'
  const baseUrl = process.env.GROQ_API_KEY 
    ? 'https://api.groq.com/openai/v1'
    : 'https://api.openai.com/v1'

  const systemPrompt = getToneSystemPrompt(tone)

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
          { role: 'user', content: `Rewrite this message: "${baseMessage}"` }
        ],
        temperature: 0.1,
        max_tokens: 300
      })
    })

    if (!response.ok) {
      return getDeterministicToneMessage(baseMessage, tone)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content?.trim()

    return content || getDeterministicToneMessage(baseMessage, tone)
  } catch {
    return getDeterministicToneMessage(baseMessage, tone)
  }
}

/**
 * Get system prompt for tone
 */
function getToneSystemPrompt(tone: ToneProfile): string {
  switch (tone) {
    case 'CALM_INFORMATIONAL':
      return `Rewrite the following message in a calm, respectful, low-panic tone. 
Do not add urgency or instructions. 
Keep it factual and reassuring. 
No emojis except ✅ ⚠️ ❌.`

    case 'ATTENTION_NEEDED':
      return `Rewrite the following message to indicate attention is needed, but remain professional and calm.
Do not add panic or urgency beyond what is necessary.
Be clear about what needs attention.
No emojis except ✅ ⚠️ ❌.`

    case 'URGENT_WAKEUP':
      return `Rewrite the following message to indicate urgency, but remain professional and respectful.
This is a wake-up call, but be clear and factual, not panicky.
No emojis except ✅ ⚠️ ❌.`

    default:
      return `Rewrite the following message in a calm, professional tone.`
  }
}

/**
 * Get deterministic tone message (fallback)
 */
function getDeterministicToneMessage(baseMessage: string, tone: ToneProfile): string {
  switch (tone) {
    case 'CALM_INFORMATIONAL':
      return baseMessage

    case 'ATTENTION_NEEDED':
      return `⚠️ ${baseMessage}`

    case 'URGENT_WAKEUP':
      return `🚨 ${baseMessage}`

    default:
      return baseMessage
  }
}

