import { NextRequest, NextResponse } from 'next/server'
import { featureFlags } from '@/config/featureFlags'

interface SLOProbeData {
  endpoint: string
  method: string
  startTime: number
  duration?: number
  status?: number
  error?: string
}

const sloProbes = new Map<string, SLOProbeData>()

export function withSLOProbe(
  handler: (req: NextRequest) => Promise<NextResponse>,
  endpoint: string
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    if (!featureFlags.slo.enabled) {
      return handler(req)
    }

    const probeId = `${endpoint}-${Date.now()}-${Math.random()}`
    const startTime = performance.now()
    
    const probeData: SLOProbeData = {
      endpoint,
      method: req.method,
      startTime,
    }
    
    sloProbes.set(probeId, probeData)

    try {
      const response = await handler(req)
      
      const duration = performance.now() - startTime
      probeData.duration = duration
      probeData.status = response.status
      
      // Log SLO metrics
      console.log(`SLO Probe [${endpoint}]: ${duration.toFixed(2)}ms (${response.status})`)
      
      // Check if we're breaching SLOs
      const targetP95 = endpoint.includes('quote') 
        ? featureFlags.slo.quote_endpoint_target_p95_ms 
        : featureFlags.slo.confirm_endpoint_target_p95_ms
      
      const targetP99 = endpoint.includes('quote') 
        ? featureFlags.slo.quote_endpoint_target_p99_ms 
        : featureFlags.slo.confirm_endpoint_target_p99_ms
      
      if (duration > targetP99) {
        console.error(`🚨 CRITICAL SLO VIOLATION [${endpoint}]: ${duration.toFixed(2)}ms > ${targetP99}ms P99 target`)
      } else if (duration > targetP95) {
        console.warn(`⚠️ WARNING SLO VIOLATION [${endpoint}]: ${duration.toFixed(2)}ms > ${targetP95}ms P95 target`)
      }
      
      return response
    } catch (error) {
      const duration = performance.now() - startTime
      probeData.duration = duration
      probeData.error = error instanceof Error ? error.message : 'Unknown error'
      
      console.error(`SLO Probe Error [${endpoint}]: ${duration.toFixed(2)}ms - ${probeData.error}`)
      throw error
    } finally {
      // Clean up probe data after 1 hour
      setTimeout(() => sloProbes.delete(probeId), 60 * 60 * 1000)
    }
  }
}

export function getSLOProbes() {
  return Array.from(sloProbes.values())
}

export function getSLOStats(endpoint?: string) {
  const probes = endpoint 
    ? Array.from(sloProbes.values()).filter(p => p.endpoint === endpoint)
    : Array.from(sloProbes.values())
  
  if (probes.length === 0) return null
  
  const durations = probes
    .filter(p => p.duration !== undefined)
    .map(p => p.duration!)
    .sort((a, b) => a - b)
  
  const p50 = durations[Math.floor(durations.length * 0.5)]
  const p95 = durations[Math.floor(durations.length * 0.95)]
  const p99 = durations[Math.floor(durations.length * 0.99)]
  
  return {
    count: probes.length,
    avg: durations.reduce((a, b) => a + b, 0) / durations.length,
    p50,
    p95,
    p99,
    min: Math.min(...durations),
    max: Math.max(...durations),
    errorRate: probes.filter(p => p.error).length / probes.length
  }
}
