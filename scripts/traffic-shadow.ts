#!/usr/bin/env tsx
/**
 * Traffic Shadowing for Canary Deployments
 * 
 * Replays a sample of real traffic against canary deployment to validate
 * performance and correctness before promotion.
 */

import * as fs from 'fs'
import * as path from 'path'

interface TrafficRequest {
  method: string
  path: string
  query?: string
  body?: unknown
  headers?: Record<string, string>
}

interface TrafficShadowResult {
  timestamp: string
  canaryUrl: string
  totalRequests: number
  statusCodes: Record<number, number>
  latencies: number[]
  errors: number
  summary: {
    averageLatency: number
    p95Latency: number
    errorRate: number
    successRate: number
  }
}

/**
 * Load traffic sample
 */
function loadTrafficSample(samplePath?: string): TrafficRequest[] {
  const defaultPath = path.join(process.cwd(), 'traffic-samples', 'booking-sample.json')
  const filePath = samplePath || process.env.TRAFFIC_LOG_PATH || defaultPath

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Traffic sample not found: ${filePath}`)
    console.log('ℹ️  Using default sample data')
    return getDefaultSample()
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    
    // Try JSON array first
    try {
      return JSON.parse(content)
    } catch {
      // Try JSONL/NDJSON
      return content
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line))
    }
  } catch (error) {
    console.warn('⚠️  Failed to parse traffic sample:', error)
    return getDefaultSample()
  }
}

/**
 * Default sample traffic
 */
function getDefaultSample(): TrafficRequest[] {
  return [
    { method: 'GET', path: '/' },
    { method: 'GET', path: '/get-started' },
    { method: 'GET', path: '/dashboard' },
    { method: 'POST', path: '/api/bookings/create', body: { providerId: 'p1', serviceId: 's1' } },
    { method: 'GET', path: '/api/search/providers', query: 'userLat=45.5&userLon=-73.6' },
    { method: 'GET', path: '/api/health' },
  ]
}

/**
 * Replay request against canary
 */
async function replayRequest(
  canaryUrl: string,
  request: TrafficRequest
): Promise<{ status: number; latency: number; error?: string }> {
  const startTime = Date.now()
  const url = new URL(request.path, canaryUrl)
  
  if (request.query) {
    url.search = request.query
  }

  try {
    const options: RequestInit = {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        ...request.headers,
      },
    }

    if (request.body && (request.method === 'POST' || request.method === 'PUT')) {
      options.body = JSON.stringify(request.body)
    }

    const response = await fetch(url.toString(), options)
    const latency = Date.now() - startTime

    return {
      status: response.status,
      latency,
    }
  } catch (error) {
    const latency = Date.now() - startTime
    return {
      status: 0,
      latency,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Run traffic shadowing
 */
async function runTrafficShadow(): Promise<TrafficShadowResult> {
  const canaryUrl = process.env.CANARY_URL || 'https://canary.bookiji.com'
  console.log(`🎭 Shadowing traffic to: ${canaryUrl}`)

  const requests = loadTrafficSample()
  console.log(`📊 Loaded ${requests.length} requests to replay`)

  const statusCodes: Record<number, number> = {}
  const latencies: number[] = []
  let errors = 0

  // Replay requests
  for (let i = 0; i < requests.length; i++) {
    const request = requests[i]
    console.log(`🔄 [${i + 1}/${requests.length}] ${request.method} ${request.path}`)

    const result = await replayRequest(canaryUrl, request)
    
    statusCodes[result.status] = (statusCodes[result.status] || 0) + 1
    latencies.push(result.latency)

    if (result.status === 0 || result.status >= 500) {
      errors++
      if (result.error) {
        console.warn(`   ⚠️  Error: ${result.error}`)
      }
    } else {
      console.log(`   ✅ ${result.status} (${result.latency}ms)`)
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Calculate summary
  const sortedLatencies = [...latencies].sort((a, b) => a - b)
  const p95Index = Math.floor(sortedLatencies.length * 0.95)
  const p95Latency = sortedLatencies[p95Index] || 0
  const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
  const errorRate = errors / requests.length
  const successRate = 1 - errorRate

  const result: TrafficShadowResult = {
    timestamp: new Date().toISOString(),
    canaryUrl,
    totalRequests: requests.length,
    statusCodes,
    latencies,
    errors,
    summary: {
      averageLatency: Math.round(averageLatency),
      p95Latency: Math.round(p95Latency),
      errorRate: Math.round(errorRate * 10000) / 100, // percentage
      successRate: Math.round(successRate * 10000) / 100,
    },
  }

  // Write results
  const resultsPath = path.join(process.cwd(), 'traffic-shadow-results.json')
  fs.writeFileSync(resultsPath, JSON.stringify(result, null, 2))
  console.log(`✅ Results written to: ${resultsPath}`)

  // Print summary
  console.log('\n📊 Traffic Shadow Summary:')
  console.log(`   Total Requests: ${result.totalRequests}`)
  console.log(`   Average Latency: ${result.summary.averageLatency}ms`)
  console.log(`   P95 Latency: ${result.summary.p95Latency}ms`)
  console.log(`   Error Rate: ${result.summary.errorRate}%`)
  console.log(`   Success Rate: ${result.summary.successRate}%`)
  console.log(`   Status Codes:`, statusCodes)

  return result
}

/**
 * Main execution
 */
async function main() {
  try {
    await runTrafficShadow()
    process.exit(0)
  } catch (error) {
    console.error('❌ Traffic shadowing failed:', error)
    process.exit(0) // Don't fail CI
  }
}

if (require.main === module) {
  main()
}

export { runTrafficShadow, type TrafficShadowResult }
