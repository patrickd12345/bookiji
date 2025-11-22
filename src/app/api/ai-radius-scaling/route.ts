import { NextResponse } from 'next/server'
import { limitRequest } from '@/middleware/requestLimiter'
import { ollamaService, BOOKIJI_PROMPTS } from '@/lib/ollama'
import { ADSENSE_APPROVAL_MODE } from "@/lib/adsense"

export async function POST(request: Request) {
  try {
    const limited = await limitRequest(request, { windowMs: 10_000, max: 20 })
    if (limited) return limited
    const { service, location, providerDensity, currentRadius } = await request.json()
    
    if (!service || !location) {
      return NextResponse.json({ 
        error: 'Service and location are required' 
      }, { status: 400 })
    }

    if (process.env.NODE_ENV === 'development' && !ADSENSE_APPROVAL_MODE) {
      console.log('🗺️ AI Radius Scaling Request:', { service, location, providerDensity, currentRadius })
    }

    // Try AI-powered radius recommendation, gracefully fall back if unavailable
    let recommendedRadius = 5
    let explanation = 'Default radius applied.'
    try {
      const aiResponse = await ollamaService.generate(
        BOOKIJI_PROMPTS.radiusScaling(providerDensity || 'medium', service)
      )
      const radiusMatch = aiResponse.match(/(\d+(?:\.\d+)?)\s*km/i)
      recommendedRadius = radiusMatch ? parseFloat(radiusMatch[1]) : 5
      explanation = aiResponse
    } catch {
      // Fallback heuristic if AI is unavailable or fails
      const density = (providerDensity || 'medium').toLowerCase()
      if (density === 'dense') recommendedRadius = 3
      else if (density === 'sparse') recommendedRadius = 10
      else recommendedRadius = 5
      explanation = `AI unavailable. Applied heuristic for ${density} areas.`
    }

    if (process.env.NODE_ENV === 'development' && !ADSENSE_APPROVAL_MODE) {
      console.log('🗺️ AI Radius Recommendation:', recommendedRadius, 'km')
    }

    return NextResponse.json({ 
      success: true, 
      recommendedRadius,
      explanation,
      service,
      location,
      providerDensity: providerDensity || 'medium'
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development' && !ADSENSE_APPROVAL_MODE) {
      console.error('❌ AI Radius Scaling error:', error)
    }
    // Final safety fallback
    const density = 'medium'
    const recommendedRadius = 5
    const explanation = 'Service temporarily unavailable. Using default radius.'
    return NextResponse.json({ 
      success: true,
      recommendedRadius,
      explanation,
      service: 'unknown',
      location: 'unknown',
      providerDensity: density
    })
  }
} 