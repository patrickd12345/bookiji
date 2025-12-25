import { createFixture } from './primitives/fixtures.mjs'
import { sendRequest } from './primitives/requests.mjs'
import { restartProcess } from './primitives/process.mjs'
import { queryState } from './primitives/queries.mjs'
import { assertInvariant } from './primitives/assertions.mjs'
import { snapshotState, saveSnapshot } from './primitives/snapshots.mjs'

export class ExecutionKernel {
  constructor(config) {
    this.config = config
    this.restBase = `${config.supabaseUrl}/rest/v1`
    this.supabaseHeaders = {
      apikey: config.supabaseServiceKey,
      Authorization: `Bearer ${config.supabaseServiceKey}`,
      'Content-Type': 'application/json'
    }
  }

  async createFixture(type, spec) {
    return await createFixture(type, spec, {
      restBase: this.restBase,
      supabaseHeaders: this.supabaseHeaders,
      supabaseUrl: this.config.supabaseUrl,
      seedStr: this.config.seedStr
    })
  }

  async sendRequest(intentId, endpoint, payload) {
    // Fire and forget - no return value
    await sendRequest(intentId, endpoint, payload, {
      restBase: this.restBase,
      supabaseHeaders: this.supabaseHeaders,
      targetUrl: this.config.targetUrl
    })
  }

  async restartProcess(delayMs) {
    await restartProcess(delayMs, this.config.rng)
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
}

