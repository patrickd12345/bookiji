/**
 * LLM Event Generator
 *
 * Generates proposed events from LLM based on world snapshot.
 * This is stateless and mockable for testing.
 */

import type { LLMProposedEvent, LLMWorldSnapshot } from './simcity-llm-events'
import { validateLLMEventSchema } from './simcity-llm-events'

/**
 * Generate proposed events from LLM
 *
 * Rules:
 * - Generate realistic flows MOST of the time
 * - Generate edge cases SOMETIMES
 * - Generate clearly impossible actions RARELY (1-5%)
 * - Output ONLY valid JSON matching the schema
 *
 * @param snapshot - World snapshot
 * @param maxEvents - Maximum number of events to generate (default: 1)
 * @returns Array of validated proposed events (empty on failure)
 */
export async function generateLLMEvents(
  snapshot: LLMWorldSnapshot,
  maxEvents: number = 1
): Promise<LLMProposedEvent[]> {
  // Fail-closed: return empty array if LLM is not available or fails
  try {
    // Check if we're in CI or if LLM is disabled
    const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test'
    const llmEnabled = process.env.SIMCITY_LLM_ENABLED === 'true'

    if (isCI || !llmEnabled) {
      // In CI or when disabled, return empty array (no network calls)
      return []
    }

    // Build prompt for LLM
    const prompt = buildLLMPrompt(snapshot, maxEvents)

    // Use Gemini (same as rest of Bookiji codebase)
    // Check for GEMINI_API_KEY first, then fallback to GOOGLE_API_KEY
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!geminiApiKey) {
      console.warn('GEMINI_API_KEY or GOOGLE_API_KEY not set, cannot generate LLM events')
      return []
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const modelName = process.env.SIMCITY_LLM_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    const model = genAI.getGenerativeModel({
      model: modelName,
    })

    const temperature = snapshot.run_goals.chaos ? 0.9 : 0.7
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        topP: 0.9,
      },
    })

    const rawText = result.response.text()

    // Parse JSON from LLM response
    // LLM might return markdown code blocks or plain JSON
    let jsonText = rawText.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    // Try to parse as single event or array
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      // Try to extract JSON from text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        return []
      }
    }

    // Normalize to array
    const eventsArray = Array.isArray(parsed) ? parsed : [parsed]

    // Validate and filter
    const validEvents: LLMProposedEvent[] = []
    for (const rawEvent of eventsArray.slice(0, maxEvents)) {
      const validation = validateLLMEventSchema(rawEvent)
      if (validation.valid && validation.event) {
        validEvents.push(validation.event)
      } else {
        console.warn(`Invalid LLM event rejected: ${validation.error}`, rawEvent)
      }
    }

    return validEvents
  } catch (error) {
    // Never throw - fail closed
    console.warn('LLM event generation failed:', error)
    return []
  }
}

/**
 * Build prompt for LLM
 */
function buildLLMPrompt(snapshot: LLMWorldSnapshot, maxEvents: number): string {
  const chaosInstruction = snapshot.run_goals.chaos
    ? 'Generate some edge cases and rare impossible actions (1-5% of events).'
    : 'Focus on realistic, feasible events.'

  return `You are generating events for a booking marketplace simulation (SimCity).

Current world state:
- Tick: ${snapshot.tick}
- Customers: ${snapshot.counts.customers}
- Vendors: ${snapshot.counts.vendors}
- Bookings: ${snapshot.counts.bookings}
- Slots: ${snapshot.counts.slots}
- Recent customer IDs: ${snapshot.recent_ids.customers.slice(0, 5).join(', ') || 'none'}
- Recent vendor IDs: ${snapshot.recent_ids.vendors.slice(0, 5).join(', ') || 'none'}
- Recent booking IDs: ${snapshot.recent_ids.bookings.slice(0, 5).join(', ') || 'none'}
- Scheduling requires subscription: ${snapshot.feature_gates.scheduling_requires_subscription}

Run goals:
- Growth: ${snapshot.run_goals.growth}
- Churn: ${snapshot.run_goals.churn}
- Chaos: ${snapshot.run_goals.chaos}

Generate ${maxEvents} event${maxEvents > 1 ? 's' : ''} as JSON. ${chaosInstruction}

Event schema (STRICT - output ONLY valid JSON):
{
  "event_id": "evt_xxx",
  "event_type": "CUSTOMER_REGISTER | VENDOR_REGISTER | CUSTOMER_SEARCH | CUSTOMER_BOOK | VENDOR_CONFIRM_BOOKING | VENDOR_CANCEL_BOOKING | CUSTOMER_RATE_VENDOR | VENDOR_CREATE_AVAILABILITY | VENDOR_SUBSCRIBE",
  "actor": {
    "kind": "customer | vendor | admin",
    "ref": "string-id"
  },
  "params": { "any": "json" },
  "intent": "short human-readable explanation",
  "chaos_level": "normal | edge | impossible"
}

Rules:
- event_id must start with "evt_"
- Use realistic actor.ref values (can reference recent_ids above or generate new ones)
- For CUSTOMER_BOOK: include vendor_id, slot_id, service_type in params
- For VENDOR_CONFIRM_BOOKING/VENDOR_CANCEL_BOOKING: include booking_id in params
- For CUSTOMER_RATE_VENDOR: include booking_id, rating (1-5), comment in params
- For VENDOR_CREATE_AVAILABILITY: include start_time, end_time, service_type in params
- chaos_level "impossible" means the event will likely fail (e.g., confirming non-existent booking)
- chaos_level "edge" means the event might fail (e.g., booking without registration)
- chaos_level "normal" means the event should succeed

Output ${maxEvents === 1 ? 'a single JSON object' : 'a JSON array of objects'} matching the schema exactly.`
}
