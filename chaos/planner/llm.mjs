import { GoogleGenerativeAI } from "@google/generative-ai"
import { listCapabilities, loadCapability } from '../capabilities/registry.mjs'
import { stableUuid } from '../kernel/utils.mjs'
import { validatePlan } from './validatePlan.mjs'

export async function getPlan(naturalLanguageIntent, context = {}) {
  const capabilities = await listCapabilities()

  const invariantGlossary = {
    slot_exclusivity: "At most one confirmed booking can exist for the same slot.",
    booking_cardinality: "Booking count for a slot must never exceed 1.",
    idempotency: "Retrying the same intent_id must not change final state.",
    availability_coherence: "Slot availability must match booking references.",
    atomic_reschedule: "Reschedule must not leave both slots booked or neither booked.",
    temporal_exclusivity: "No overlapping bookings for the same provider.",
    tenant_isolation: "No cross-vendor references or data bleed."
  }

  const schema = {
    type: "object",
    required: ["stop_conditions"],
    additionalProperties: false,
    properties: {
      capability: { type: "string" },
      sequence: {
        type: "array",
        items: {
          type: "object",
          required: ["capability", "chaos_profile"],
          properties: {
            capability: { type: "string" },
            iterations: { type: "integer", minimum: 1, maximum: 5000 },
            chaos_profile: {
              type: "object",
              required: ["iterations", "retry_rate", "restart_rate", "reorder_rate"],
              properties: {
                iterations: { type: "integer", minimum: 1, maximum: 5000 },
                retry_rate: { type: "number", minimum: 0, maximum: 1 },
                restart_rate: { type: "number", minimum: 0, maximum: 1 },
                reorder_rate: { type: "number", minimum: 0, maximum: 1 }
              }
            }
          }
        },
        maxItems: 5
      },
      parameters: { type: "object" },
      chaos_profile: {
        type: "object",
        required: ["iterations", "retry_rate", "restart_rate", "reorder_rate"],
        additionalProperties: false,
        properties: {
          iterations: { type: "integer", minimum: 1, maximum: 5000 },
          retry_rate: { type: "number", minimum: 0, maximum: 1 },
          restart_rate: { type: "number", minimum: 0, maximum: 1 },
          reorder_rate: { type: "number", minimum: 0, maximum: 1 }
        }
      },
      assertions: {
        type: "array",
        items: { type: "string" },
        minItems: 1
      },
      stop_conditions: {
        type: "array",
        items: { 
          type: "string",
          enum: ["invariant_violation", "time_budget_exhausted"]
        },
        minItems: 1
      },
      time_budget_seconds: {
        type: "integer",
        minimum: 1,
        maximum: 86400 // 24 hours max
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"]
      },
      confidence_rationale: {
        type: "string"
      }
    }
  }

  const systemPrompt = buildSystemPrompt(capabilities, invariantGlossary, schema)

  const geminiPlan = await callGeminiPlanner(systemPrompt, naturalLanguageIntent, context)

  // Map Gemini plan to runner format
  const plan = await mapGeminiPlanToRunner(geminiPlan, capabilities, { ...context, naturalLanguageIntent })

  // Validate the mapped plan
  validatePlan(plan, capabilities, invariantGlossary)

  return plan
}

function buildSystemPrompt(capabilities, invariantGlossary, schema) {
  // Simplify capabilities for prompt (just id, name, description)
  const capabilityList = capabilities.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description
  }))

  return `You are SimCity Planner.

You MUST output ONLY valid JSON.
You MUST NOT output explanations, markdown, or prose.

Rules:
- Choose ONE capability from the registry OR a sequence of capabilities (max 5).
- Choose assertions ONLY from the invariant glossary.
- Do NOT invent new capabilities or invariants.
- Output MUST match the JSON schema exactly.
- stop_conditions MUST include "invariant_violation".
- If the intent mentions a time duration (e.g., "30 minutes", "1 hour"), add "time_budget_exhausted" to stop_conditions and set time_budget_seconds accordingly.
- For aggressive/soak runs, set higher retry_rate (0.4-0.6) and restart_rate (0.3-0.5) to escalate chaos.
- If using sequence, each step must have capability and chaos_profile.
- Include confidence level (high/medium/low) and rationale.

Time Budget Examples:
- "30 minutes" → time_budget_seconds: 1800
- "1 hour" → time_budget_seconds: 3600
- "5 minutes" → time_budget_seconds: 300

Chaos Escalation:
- Normal: retry_rate: 0.2-0.3, restart_rate: 0.1-0.2
- Aggressive: retry_rate: 0.4-0.6, restart_rate: 0.3-0.5
- Soak test: retry_rate: 0.5-0.7, restart_rate: 0.4-0.6

If the intent cannot be satisfied, output exactly:
{"error":"UNSUPPORTED_INTENT"}

CAPABILITY REGISTRY:
${JSON.stringify(capabilityList, null, 2)}

INVARIANT GLOSSARY:
${JSON.stringify(invariantGlossary, null, 2)}

OUTPUT JSON SCHEMA:
${JSON.stringify(schema, null, 2)}`
}

async function callGeminiPlanner(systemPrompt, userIntent, context) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable")
  }

  const modelName = process.env.SIMCITY_PLANNER_MODEL || "gemini-1.5-flash"

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json"
    },
    systemInstruction: systemPrompt
  })

  // Use systemInstruction for the prompt, user message for intent
  const result = await model.generateContent(userIntent)

  const text = result.response.text()
  if (!text) {
    throw new Error("Gemini returned empty response")
  }

  let plan
  try {
    plan = JSON.parse(text)
  } catch (err) {
    throw new Error(`Gemini did not return valid JSON: ${text.slice(0, 500)}`)
  }

  if (plan?.error === "UNSUPPORTED_INTENT") {
    return {
      error: 'UNSUPPORTED_INTENT',
      message: `Intent not supported: "${userIntent}"`,
      supportedIntents: ['double booking attack', 'reschedule atomicity']
    }
  }

  return plan
}

async function mapGeminiPlanToRunner(geminiPlan, capabilities, context) {
  // If Gemini returned an error, pass it through
  if (geminiPlan.error) {
    return geminiPlan
  }

  // Extract seed
  const intent = (context.naturalLanguageIntent || '').toLowerCase()
  const seed = context.seed || `${intent.replace(/[^a-z0-9]/g, '').slice(0, 15)}-${Date.now().toString(36)}` || `default-${Date.now()}`

  // Handle sequence plans
  if (geminiPlan.sequence && Array.isArray(geminiPlan.sequence)) {
    // Validate all capabilities exist
    for (const step of geminiPlan.sequence) {
      const capability = capabilities.find(c => c.id === step.capability)
      if (!capability) {
        throw new Error(`Capability "${step.capability}" not found in registry`)
      }
    }

    return {
      sequence: geminiPlan.sequence,
      seed,
      stop_conditions: geminiPlan.stop_conditions || ['invariant_violation'],
      time_budget_seconds: geminiPlan.time_budget_seconds,
      confidence: geminiPlan.confidence || 'medium',
      confidence_rationale: geminiPlan.confidence_rationale || 'Sequence plan generated'
    }
  }

  // Single capability plan
  const capability = capabilities.find(c => c.id === geminiPlan.capability)
  if (!capability) {
    throw new Error(`Capability "${geminiPlan.capability}" not found in registry`)
  }

  const iterations = geminiPlan.chaos_profile?.iterations || 50
  const chaosProfile = mapChaosProfile(geminiPlan.chaos_profile, capability.id)

  // Build plan in runner format
  const plan = {
    capabilityId: capability.id,
    seed,
    iterations,
    fixtureSpecs: capability.fixtureSpecs,
    intentSpecs: capability.intentSpecs,
    invariantSpecs: capability.invariantSpecs,
    chaosProfile,
    stop_conditions: geminiPlan.stop_conditions || ['invariant_violation'],
    time_budget_seconds: geminiPlan.time_budget_seconds,
    confidence: geminiPlan.confidence || 'medium',
    confidence_rationale: geminiPlan.confidence_rationale || 'Single capability plan generated'
  }

  return plan
}

function mapChaosProfile(geminiProfile, capabilityId) {
  const { retry_rate = 0.3, restart_rate = 0.2, reorder_rate = 0.0 } = geminiProfile || {}
  
  // For double_booking_attack, we have two intents (A and B)
  if (capabilityId === 'double_booking_attack') {
    const sendRate = (1 - retry_rate - restart_rate - reorder_rate) / 2 // Split between A and B
    return {
      send_request_A: sendRate,
      send_request_B: sendRate,
      retry_request_A: retry_rate / 2,
      retry_request_B: retry_rate / 2,
      restart_process: restart_rate,
      no_op: reorder_rate
    }
  } else {
    // For reschedule_atomicity, we have one intent
    const sendRate = 1 - retry_rate - restart_rate - reorder_rate
    return {
      send_request: sendRate,
      retry_request: retry_rate,
      restart_process: restart_rate,
      no_op: reorder_rate
    }
  }
}

