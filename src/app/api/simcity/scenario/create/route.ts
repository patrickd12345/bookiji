import { NextRequest, NextResponse } from 'next/server';
import { compileScenario } from '@/simcity/compiler';
import { ScenarioPrompt } from '@/simcity/compiler/ScenarioPrompt';
import { DomainRegistry } from '@/governance/DomainRegistry';
import { getLLMService } from '@/lib/support/llm-service';
import { ALLOWED_PERTURBATIONS } from '@/simcity/compiler/ScenarioValidator';
import { ScenarioOverride } from '@/lib/simcity/types';

// Default domain registry for SimCity scenarios
const DEFAULT_REGISTRY: DomainRegistry = {
  entries: [
    {
      domain: 'booking',
      contract: {
        domain: 'booking',
        version: '1.0.0',
        stability: 'stable',
        allowedMutations: [],
        forbiddenMutations: [],
      },
    },
    {
      domain: 'provider',
      contract: {
        domain: 'provider',
        version: '1.0.0',
        stability: 'stable',
        allowedMutations: [],
        forbiddenMutations: [],
      },
    },
    {
      domain: 'ops',
      contract: {
        domain: 'ops',
        version: '1.0.0',
        stability: 'stable',
        allowedMutations: [],
        forbiddenMutations: [],
      },
    },
    {
      domain: 'trust_safety',
      contract: {
        domain: 'trust_safety',
        version: '1.0.0',
        stability: 'experimental',
        allowedMutations: [],
        forbiddenMutations: [],
      },
    },
  ],
};

/**
 * Parse natural language description and extract structured scenario information
 */
async function parseScenarioDescription(description: string): Promise<{
  parsed: ScenarioPrompt;
  suggestions: string[];
  detectedPerturbations: string[];
}> {
  try {
    // Get Gemini LLM service (defaults to Gemini if GEMINI_API_KEY is set)
    // Falls back to keyword detection if LLM is not configured
    const llmService = getLLMService();
    
    const systemPrompt = `You are a SimCity scenario parser. Analyze scenario descriptions and extract structured information.

Available perturbation types:
${Object.entries(ALLOWED_PERTURBATIONS).map(([type, spec]) => 
  `- ${type}: ${spec.description} (domain: ${spec.domain})`
).join('\n')}

Respond with ONLY a valid JSON object (no markdown, no code blocks, no explanation):
{
  "intent": "stress" | "explore" | "postmortem" | null,
  "description": "cleaned and normalized description",
  "detectedPerturbations": ["array of detected perturbation types"],
  "suggestions": ["array of improvement suggestions"],
  "constraints": ["array of any constraints mentioned"]
}

Focus on detecting: demand spikes, provider outages, cancellations, latency issues, trust/safety concerns.`;

    const userQuestion = `Analyze this scenario description: "${description}"`;

    const response = await llmService.generateAnswer(systemPrompt, userQuestion);
    
    // Try to extract JSON from response (handle markdown code blocks)
    let jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Try to find JSON in code blocks
      const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        jsonMatch = [codeBlockMatch[1]];
      }
    }
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        parsed: {
          description: parsed.description || description,
          intent: parsed.intent || undefined,
          constraints: parsed.constraints || [],
        },
        suggestions: parsed.suggestions || [],
        detectedPerturbations: parsed.detectedPerturbations || [],
      };
    }
  } catch (error) {
    // LLM not configured or failed - use fallback keyword detection
    console.warn('LLM parsing failed (LLM may not be configured), using fallback keyword detection:', error instanceof Error ? error.message : error);
  }

  // Fallback: use simple keyword detection
  return parseScenarioDescriptionFallback(description);
}

/**
 * Fallback parser using keyword detection
 */
function parseScenarioDescriptionFallback(description: string): {
  parsed: ScenarioPrompt;
  suggestions: string[];
  detectedPerturbations: string[];
} {
  const normalized = description.toLowerCase();
  const detectedPerturbations: string[] = [];
  const suggestions: string[] = [];

  if (normalized.includes('demand') || normalized.includes('spike') || normalized.includes('traffic')) {
    detectedPerturbations.push('demandSpike');
  }
  if (normalized.includes('provider') || normalized.includes('supply') || normalized.includes('outage')) {
    detectedPerturbations.push('providerDrop');
  }
  if (normalized.includes('cancel') || normalized.includes('no-show') || normalized.includes('noshow')) {
    detectedPerturbations.push('cancellationBias');
  }
  if (normalized.includes('latency') || normalized.includes('slow') || normalized.includes('queue')) {
    detectedPerturbations.push('latencyInflation');
  }
  if (normalized.includes('fraud') || normalized.includes('trust') || normalized.includes('abuse')) {
    detectedPerturbations.push('trustSignal');
  }

  // Generate suggestions
  if (detectedPerturbations.length === 0) {
    suggestions.push('Consider specifying what type of stress you want to test (e.g., "demand spike", "provider outage", "high cancellation rate")');
  }
  if (!normalized.includes('duration') && !normalized.includes('time')) {
    suggestions.push('Consider specifying a duration (e.g., "run for 1 hour" or "simulate 24 hours")');
  }
  if (detectedPerturbations.length > 0) {
    suggestions.push(`Detected perturbations: ${detectedPerturbations.join(', ')}. You can refine the magnitude or add more details.`);
  }

  return {
    parsed: {
      description,
    },
    suggestions,
    detectedPerturbations,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, seed } = body;

    if (!description || typeof description !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Description is required and must be a string',
      }, { status: 400 });
    }

    if (description.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Description cannot be empty',
      }, { status: 400 });
    }

    // Parse the description
    const { parsed, suggestions, detectedPerturbations } = await parseScenarioDescription(description);

    // Generate a deterministic seed if not provided
    const scenarioSeed = seed ?? Math.floor(Math.random() * 1000000);

    // Compile the scenario
    let compiledScenario;
    try {
      compiledScenario = compileScenario(parsed, {
        seed: scenarioSeed,
        registry: DEFAULT_REGISTRY,
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to compile scenario',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestions: [
          ...suggestions,
          'Make sure your description includes at least one expressible perturbation (demand spike, provider outage, cancellations, latency, or trust/safety concerns)',
        ],
      }, { status: 400 });
    }

    // Generate additional suggestions based on compiled scenario
    const finalSuggestions = [...suggestions];
    if (compiledScenario.perturbations && compiledScenario.perturbations.length > 0) {
      finalSuggestions.push(
        `Scenario will test: ${compiledScenario.perturbations.map(p => `${p.type} (${p.domain})`).join(', ')}`
      );
    }
    if (!parsed.intent) {
      finalSuggestions.push('Consider specifying intent: "stress" (stress test), "explore" (explore behavior), or "postmortem" (investigate issue)');
    }

    // Convert compiled scenario to ScenarioOverride for the engine
    const scenarioOverride: ScenarioOverride = {
      id: compiledScenario.id,
      label: compiledScenario.label,
      description: compiledScenario.perturbations?.map(p => p.description).join('; ') || parsed.description,
      spawnRate: compiledScenario.perturbations?.some(p => p.type === 'demandSpike') ? 2.0 : 1.0,
      cancelRate: compiledScenario.perturbations?.some(p => p.type === 'cancellationBias') 
        ? (compiledScenario.perturbations.find(p => p.type === 'cancellationBias')?.magnitude || 0.2)
        : 0.1,
      confirmRate: compiledScenario.perturbations?.some(p => p.type === 'cancellationBias') ? 0.5 : 0.7,
      tags: compiledScenario.perturbations?.map(p => p.type),
    };

    return NextResponse.json({
      success: true,
      scenario: {
        id: compiledScenario.id,
        label: compiledScenario.label,
        seed: compiledScenario.seed,
        perturbations: compiledScenario.perturbations,
        assumptions: compiledScenario.assumptions,
        confidence: compiledScenario.confidence,
      },
      scenarioOverride, // Include the override for starting the simulation
      suggestions: finalSuggestions,
      detectedPerturbations,
      compiledAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('SimCity scenario creation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create scenario',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

