/**
 * SimCity Planner - Generates test plans from natural language
 * 
 * Supports two modes:
 * - 'stub': Hardcoded plans (for testing)
 * - 'llm': Uses Gemini API to generate plans from natural language
 */

const SCHEDULING_CAPABILITIES = [
  'double_booking_attack',
  'reschedule_atomicity',
  'concurrent_booking_attempt',
  'slot_availability_race'
]

/**
 * @param {string} naturalLanguageIntent - User's natural language request
 * @param {Object} context - Configuration context
 * @returns {Promise<Plan>} Structured plan object
 */
export async function getPlan(naturalLanguageCommand, context = {}) {
  const { plannerMode = 'stub', geminiApiKey, geminiModel = 'gemini-1.5-flash' } = context

  if (plannerMode === 'stub') {
    return getStubPlan(naturalLanguageCommand)
  }

  if (plannerMode === 'llm') {
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required for LLM planner mode')
    }
    return getLLMPlan(naturalLanguageCommand, { geminiApiKey, geminiModel })
  }

  throw new Error(`Unknown planner mode: ${plannerMode}`)
}

/**
 * Stub planner - generates hardcoded plans based on keywords
 */
function getStubPlan(command) {
  const text = command.toLowerCase()
  
  // Parse duration (default: 30 minutes)
  let durationMinutes = 30
  const durationMatch = text.match(/(\d+)\s*(?:min|minute|minutes)/)
  if (durationMatch) {
    durationMinutes = parseInt(durationMatch[1], 10)
  }

  // Detect "all scheduling attacks"
  const capabilities = text.includes('all') || text.includes('scheduling')
    ? SCHEDULING_CAPABILITIES
    : ['double_booking_attack'] // Default

  // Escalate chaos rates if requested
  const escalate = text.includes('escalate') || text.includes('escalated')
  const retryRate = escalate ? 0.3 : 0.1  // 30% retry rate when escalated
  const restartRate = escalate ? 0.05 : 0.01  // 5% restart rate when escalated

  // Stop on violation (default: true)
  const stopOnViolation = !text.includes('continue') && !text.includes('ignore')

  return {
    capabilityIds: capabilities,
    durationMinutes,
    chaos: {
      retryRate,
      restartRate,
      reorderRate: 0.1
    },
    stopOnInvariantViolation: stopOnViolation,
    seed: `soak-${Date.now()}`,
    concurrency: 4,
    maxEvents: 10000 // High limit, time-based cutoff
  }
}

/**
 * LLM planner - uses Gemini to generate plans
 */
async function getLLMPlan(command, { geminiApiKey, geminiModel }) {
  const prompt = `You are a chaos engineering test planner. Generate a structured test plan from the user's natural language request.

Available capabilities:
${SCHEDULING_CAPABILITIES.map(c => `- ${c}`).join('\n')}

User request: "${command}"

Generate a JSON plan with this structure:
{
  "capabilityIds": ["double_booking_attack", "reschedule_atomicity"],
  "durationMinutes": 30,
  "chaos": {
    "retryRate": 0.3,
    "restartRate": 0.05,
    "reorderRate": 0.1
  },
  "stopOnInvariantViolation": true,
  "seed": "soak-${Date.now()}",
  "concurrency": 4,
  "maxEvents": 10000
}

Rules:
- If user asks for "all scheduling attacks", include all capabilities
- If user asks to "escalate", increase retryRate to 0.3 and restartRate to 0.05
- Default duration is 30 minutes unless specified
- Always set stopOnInvariantViolation to true unless user explicitly says to continue
- Return ONLY valid JSON, no markdown, no explanation`

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!text) {
      throw new Error('No response from Gemini API')
    }

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/)
    const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text
    
    const plan = JSON.parse(jsonText)
    
    // Validate and set defaults
    return {
      capabilityIds: Array.isArray(plan.capabilityIds) ? plan.capabilityIds : SCHEDULING_CAPABILITIES,
      durationMinutes: plan.durationMinutes || 30,
      chaos: {
        retryRate: plan.chaos?.retryRate ?? 0.3,
        restartRate: plan.chaos?.restartRate ?? 0.05,
        reorderRate: plan.chaos?.reorderRate ?? 0.1
      },
      stopOnInvariantViolation: plan.stopOnInvariantViolation !== false,
      seed: plan.seed || `soak-${Date.now()}`,
      concurrency: plan.concurrency || 4,
      maxEvents: plan.maxEvents || 10000
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse LLM response as JSON: ${error.message}`)
    }
    throw error
  }
}
