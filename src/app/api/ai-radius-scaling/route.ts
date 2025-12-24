import { NextResponse } from 'next/server'
import { limitRequest } from '@/middleware/requestLimiter'
import { ollamaService, BOOKIJI_PROMPTS } from '@/lib/ollama'
import { ADSENSE_APPROVAL_MODE } from "@/lib/adsense"

export async function POST(request: Request) {
  try {
    const limited = await limitRequest(request, { windowMs: 10_000, max: 20 })
    if (limited) return limited
    let body;
    try {
      body = await request.json()
    } catch (e) {
      if (process.env.NODE_ENV === 'development' && !ADSENSE_APPROVAL_MODE) {
        console.error('❌ AI Radius Scaling: Failed to parse request JSON:', e)
      }
      throw e; // Re-throw to be caught by outer catch
    }
    const { service, location, providerDensity, currentRadius } = body
    
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
      else if (density === 'sparse') recommendedRadius = 15 // Increased to match AI recommendation
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
    
    const isAborted = error instanceof Error && 
      (error.name === 'AbortError' || 
       error.message.includes('aborted') || 
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       (error as any).code === 'ECONNRESET');

    if (process.env.NODE_ENV === 'development' && !ADSENSE_APPROVAL_MODE) {
      if (isAborted) {
        console.warn('⚠️ AI Radius Scaling: Request aborted or connection reset by client.');
      } else {
        console.error('❌ AI Radius Scaling error:', error)
      }
    }

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