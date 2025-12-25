import { createFixture } from './primitives/fixtures.mjs'
import { restartProcess } from './primitives/process.mjs'
import { queryState } from './primitives/queries.mjs'
import { assertInvariant } from './primitives/assertions.mjs'
import { snapshotState, saveSnapshot } from './primitives/snapshots.mjs'
import * as httpTransport from './transports/http.mjs'
import * as playwrightTransport from './transports/playwright.mjs'

export class ExecutionKernel {
  constructor(config) {
    this.config = config
    this.restBase = `${config.supabaseUrl}/rest/v1`
    this.supabaseHeaders = {
      apikey: config.supabaseServiceKey,
      Authorization: `Bearer ${config.supabaseServiceKey}`,
      'Content-Type': 'application/json'
    }
    // Track if Playwright transport has been used
    this.playwrightUsed = false
  }

  async createFixture(type, spec) {
    return await createFixture(type, spec, {
      restBase: this.restBase,
      supabaseHeaders: this.supabaseHeaders,
      supabaseUrl: this.config.supabaseUrl,
      seedStr: this.config.seedStr
    })
  }

  async sendRequest(intentId, endpoint, payload, options = {}) {
    // Route to appropriate transport
    // Default to HTTP transport (backward compatible)
    const transport = options.transport || 'http'

    const context = {
      restBase: this.restBase,
      supabaseHeaders: this.supabaseHeaders,
      targetUrl: this.config.targetUrl
    }

    if (transport === 'playwright') {
      // Playwright transport - requires SIMCITY_E2E_BASE_URL
      this.playwrightUsed = true
      await playwrightTransport.execute({ intentId, endpoint, payload, context })
    } else {
      // Default HTTP transport
      await httpTransport.execute({ intentId, endpoint, payload, context })
    }
  }

  async restartProcess(delayMs) {
    // Simulate backend process restart delay
    await restartProcess(delayMs, this.config.rng)
    
    // If Playwright transport is being used, also restart browser
    if (this.playwrightUsed && playwrightTransport.isActive()) {
      // Randomly choose between page reload (lighter) or context restart (heavier)
      const shouldRestartContext = this.config.rng ? this.config.rng() < 0.3 : Math.random() < 0.3
      
      try {
        if (shouldRestartContext) {
          // Full context restart (simulates browser restart)
          await playwrightTransport.restartContext()
        } else {
          // Page reload (simulates page refresh)
          await playwrightTransport.reloadPage()
        }
      } catch (err) {
        // Ignore errors - browser restart is optional enhancement
        // Backend restart already happened, browser restart failure is non-critical
      }
    }
  }

  async queryState(query) {
    return await queryState(query, {
      restBase: this.restBase,
      supabaseHeaders: this.supabaseHeaders
    })
  }

  assertInvariant(invariantId, state, expectation) {
    return assertInvariant(invariantId, state, expectation)
  }

  snapshotState(state, metadata) {
    return snapshotState(state, metadata)
  }

  async saveSnapshot(snapshot, outputDir) {
    return await saveSnapshot(snapshot, outputDir)
  }

  /**
   * Shutdown all transports (cleanup)
   * Call this when done with kernel execution
   */
  async shutdown() {
    // Shutdown Playwright if it was used
    try {
      await playwrightTransport.shutdown()
    } catch (err) {
      // Ignore errors during shutdown
    }
  }
}

