import { NextResponse } from 'next/server'
import { ollamaService, BOOKIJI_PROMPTS } from '../../../../lib/ollama'

export async function POST(request: Request) {
  try {
    const { service, location, providerDensity, currentRadius } = await request.json()
    
    if (!service || !location) {
      return NextResponse.json({ 
        error: 'Service and location are required' 
      }, { status: 400 })
    }

    if (process.env.NODE_ENV === 'development' && !process.env.ADSENSE_APPROVAL_MODE) {
      console.log('🗺️ AI Radius Scaling Request:', { service, location, providerDensity, currentRadius })
    }

    // Generate AI-powered radius recommendation
    const aiResponse = await ollamaService.generate(
      BOOKIJI_PROMPTS.radiusScaling(providerDensity || 'medium', service)
    )

    // Parse the AI response to extract radius and explanation
    const radiusMatch = aiResponse.match(/(\d+(?:\.\d+)?)\s*km/i)
    const recommendedRadius = radiusMatch ? parseFloat(radiusMatch[1]) : 5

    if (process.env.NODE_ENV === 'development' && !process.env.ADSENSE_APPROVAL_MODE) {
      console.log('🗺️ AI Radius Recommendation:', recommendedRadius, 'km')
    }

    return NextResponse.json({ 
      success: true, 
      recommendedRadius,
      explanation: aiResponse,
      service,
      location,
      providerDensity: providerDensity || 'medium'
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development' && !process.env.ADSENSE_APPROVAL_MODE) {
      console.error('❌ AI Radius Scaling error:', error)
    }
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate radius recommendation',
      success: false
    }, { status: 500 })
  }
} 